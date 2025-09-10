#!/bin/bash
# Script for dynamic provisioning and policy-based scaling

set -e

# Configuration
THRESHOLD_CPU=${THRESHOLD_CPU:-70}
THRESHOLD_MEMORY=${THRESHOLD_MEMORY:-80}
SCALE_UP_FACTOR=${SCALE_UP_FACTOR:-1.5}
SCALE_DOWN_FACTOR=${SCALE_DOWN_FACTOR:-0.7}
MONITORING_INTERVAL=${MONITORING_INTERVAL:-300}  # 5 minutes
LOG_FILE=${LOG_FILE:-"/var/log/scaling.log"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${timestamp} [${level}] ${message}" >> "${LOG_FILE}"
  echo -e "${timestamp} [${level}] ${message}"
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to get CPU usage from AWS CloudWatch
get_aws_cpu_usage() {
  local instance_id=$1
  if ! command_exists aws; then
    echo "70"  # Return high CPU if AWS CLI not available
    return
  fi

  # Get CPU utilization from CloudWatch (last 5 minutes average)
  aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value="${instance_id}" \
    --start-time "$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%S')" \
    --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
    --period 300 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text 2>/dev/null || echo "70"
}

# Function to get memory usage from AWS CloudWatch
get_aws_memory_usage() {
  local instance_id=$1
  if ! command_exists aws; then
    echo "75"  # Return high memory if AWS CLI not available
    return
  fi

  # Get memory utilization (requires CloudWatch agent)
  aws cloudwatch get-metric-statistics \
    --namespace System/Linux \
    --metric-name MemoryUtilization \
    --dimensions Name=InstanceId,Value="${instance_id}" \
    --start-time "$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%S')" \
    --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
    --period 300 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text 2>/dev/null || echo "75"
}

# Function to get CPU usage from Azure Monitor
get_azure_cpu_usage() {
  local resource_group=$1
  local vm_name=$2
  if ! command_exists az; then
    echo "70"
    return
  fi

  # Get CPU utilization from Azure Monitor
  az monitor metrics list \
    --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${resource_group}/providers/Microsoft.Compute/virtualMachines/${vm_name}" \
    --metric "Percentage CPU" \
    --interval PT5M \
    --query 'value[0].timeseries[0].data[-1].average' \
    --output tsv 2>/dev/null || echo "70"
}

# Function to get memory usage from Azure Monitor
get_azure_memory_usage() {
  local resource_group=$1
  local vm_name=$2
  if ! command_exists az; then
    echo "75"
    return
  fi

  # Get available memory percentage and calculate usage
  available_memory=$(az monitor metrics list \
    --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${resource_group}/providers/Microsoft.Compute/virtualMachines/${vm_name}" \
    --metric "Available Memory Bytes" \
    --interval PT5M \
    --query 'value[0].timeseries[0].data[-1].average' \
    --output tsv 2>/dev/null || echo "0")

  if [ "$available_memory" != "0" ]; then
    # Assuming 4GB total memory for calculation
    total_memory=4294967296
    used_memory=$((total_memory - available_memory))
    memory_usage=$((used_memory * 100 / total_memory))
    echo "$memory_usage"
  else
    echo "75"
  fi
}

# Function to get CPU usage from GCP Monitoring
get_gcp_cpu_usage() {
  local project_id=$1
  local instance_name=$2
  local zone=$3
  if ! command_exists gcloud; then
    echo "70"
    return
  fi

  # Get CPU utilization from GCP Monitoring
  gcloud monitoring metrics list-descriptors \
    --project="${project_id}" \
    --filter="metric.type=compute.googleapis.com/instance/cpu/utilization" \
    --format="value(points[0].value.double_value)" 2>/dev/null || echo "70"
}

# Function to get memory usage from GCP Monitoring
get_gcp_memory_usage() {
  local project_id=$1
  local instance_name=$2
  local zone=$3
  if ! command_exists gcloud; then
    echo "75"
    return
  fi

  # Get memory utilization from GCP Monitoring
  gcloud monitoring metrics list-descriptors \
    --project="${project_id}" \
    --filter="metric.type=compute.googleapis.com/instance/memory/utilization" \
    --format="value(points[0].value.double_value)" 2>/dev/null || echo "75"
}

# Function to scale AWS resources
scale_aws_resources() {
  local action=$1
  local asg_name=${AWS_ASG_NAME:-"multi-cloud-asg"}

  if ! command_exists aws; then
    log "ERROR" "AWS CLI not found. Cannot scale AWS resources."
    return 1
  fi

  # Get current capacity
  current_capacity=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "${asg_name}" \
    --query 'AutoScalingGroups[0].DesiredCapacity' \
    --output text 2>/dev/null || echo "1")

  if [ "$action" = "up" ]; then
    new_capacity=$(echo "scale=0; ${current_capacity} * ${SCALE_UP_FACTOR}" | bc)
    new_capacity=$(printf "%.0f" "$new_capacity")
    if [ "$new_capacity" -eq "$current_capacity" ]; then
      new_capacity=$((current_capacity + 1))
    fi
    log "INFO" "Scaling up AWS ASG ${asg_name} from ${current_capacity} to ${new_capacity} instances"
    aws autoscaling set-desired-capacity \
      --auto-scaling-group-name "${asg_name}" \
      --desired-capacity "${new_capacity}"
  else
    new_capacity=$(echo "scale=0; ${current_capacity} * ${SCALE_DOWN_FACTOR}" | bc)
    new_capacity=$(printf "%.0f" "$new_capacity")
    if [ "$new_capacity" -eq "$current_capacity" ] && [ "$current_capacity" -gt "1" ]; then
      new_capacity=$((current_capacity - 1))
    fi
    if [ "$new_capacity" -lt "1" ]; then
      new_capacity=1
    fi
    log "INFO" "Scaling down AWS ASG ${asg_name} from ${current_capacity} to ${new_capacity} instances"
    aws autoscaling set-desired-capacity \
      --auto-scaling-group-name "${asg_name}" \
      --desired-capacity "${new_capacity}"
  fi
}

# Function to scale Azure resources
scale_azure_resources() {
  local action=$1
  local resource_group=${AZURE_RESOURCE_GROUP:-"multi-cloud-rg"}
  local vmss_name=${AZURE_VMSS_NAME:-"multi-cloud-vmss"}

  if ! command_exists az; then
    log "ERROR" "Azure CLI not found. Cannot scale Azure resources."
    return 1
  fi

  # Get current capacity
  current_capacity=$(az vmss show \
    --resource-group "${resource_group}" \
    --name "${vmss_name}" \
    --query 'sku.capacity' \
    --output tsv 2>/dev/null || echo "1")

  if [ "$action" = "up" ]; then
    new_capacity=$(echo "scale=0; ${current_capacity} * ${SCALE_UP_FACTOR}" | bc)
    new_capacity=$(printf "%.0f" "$new_capacity")
    if [ "$new_capacity" -eq "$current_capacity" ]; then
      new_capacity=$((current_capacity + 1))
    fi
    log "INFO" "Scaling up Azure VMSS ${vmss_name} from ${current_capacity} to ${new_capacity} instances"
    az vmss scale \
      --resource-group "${resource_group}" \
      --name "${vmss_name}" \
      --new-capacity "${new_capacity}"
  else
    new_capacity=$(echo "scale=0; ${current_capacity} * ${SCALE_DOWN_FACTOR}" | bc)
    new_capacity=$(printf "%.0f" "$new_capacity")
    if [ "$new_capacity" -eq "$current_capacity" ] && [ "$current_capacity" -gt "1" ]; then
      new_capacity=$((current_capacity - 1))
    fi
    if [ "$new_capacity" -lt "1" ]; then
      new_capacity=1
    fi
    log "INFO" "Scaling down Azure VMSS ${vmss_name} from ${current_capacity} to ${new_capacity} instances"
    az vmss scale \
      --resource-group "${resource_group}" \
      --name "${vmss_name}" \
      --new-capacity "${new_capacity}"
  fi
}

# Function to scale GCP resources
scale_gcp_resources() {
  local action=$1
  local project_id=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
  local instance_group=${GCP_INSTANCE_GROUP:-"multi-cloud-mig"}
  local zone=${GCP_ZONE:-"us-central1-a"}

  if ! command_exists gcloud; then
    log "ERROR" "gcloud CLI not found. Cannot scale GCP resources."
    return 1
  fi

  # Get current size
  current_size=$(gcloud compute instance-groups managed describe "${instance_group}" \
    --zone "${zone}" \
    --project "${project_id}" \
    --format "value(targetSize)" 2>/dev/null || echo "1")

  if [ "$action" = "up" ]; then
    new_size=$(echo "scale=0; ${current_size} * ${SCALE_UP_FACTOR}" | bc)
    new_size=$(printf "%.0f" "$new_size")
    if [ "$new_size" -eq "$current_size" ]; then
      new_size=$((current_size + 1))
    fi
    log "INFO" "Scaling up GCP MIG ${instance_group} from ${current_size} to ${new_size} instances"
    gcloud compute instance-groups managed resize "${instance_group}" \
      --size "${new_size}" \
      --zone "${zone}" \
      --project "${project_id}"
  else
    new_size=$(echo "scale=0; ${current_size} * ${SCALE_DOWN_FACTOR}" | bc)
    new_size=$(printf "%.0f" "$new_size")
    if [ "$new_size" -eq "$current_size" ] && [ "$current_size" -gt "1" ]; then
      new_size=$((current_size - 1))
    fi
    if [ "$new_size" -lt "1" ]; then
      new_size=1
    fi
    log "INFO" "Scaling down GCP MIG ${instance_group} from ${current_size} to ${new_size} instances"
    gcloud compute instance-groups managed resize "${instance_group}" \
      --size "${new_size}" \
      --zone "${zone}" \
      --project "${project_id}"
  fi
}

# Function to get metrics based on provider
get_metrics() {
  local provider=$1
  local instance_id=$2
  local resource_group=$3
  local zone=$4

  case $provider in
    aws)
      cpu_usage=$(get_aws_cpu_usage "$instance_id")
      memory_usage=$(get_aws_memory_usage "$instance_id")
      ;;
    azure)
      cpu_usage=$(get_azure_cpu_usage "$resource_group" "$instance_id")
      memory_usage=$(get_azure_memory_usage "$resource_group" "$instance_id")
      ;;
    gcp)
      cpu_usage=$(get_gcp_cpu_usage "$GCP_PROJECT_ID" "$instance_id" "$zone")
      memory_usage=$(get_gcp_memory_usage "$GCP_PROJECT_ID" "$instance_id" "$zone")
      ;;
    *)
      cpu_usage=$((RANDOM % 100))
      memory_usage=$((RANDOM % 100))
      ;;
  esac

  echo "$cpu_usage $memory_usage"
}

# Function to scale resources
scale_resources() {
  local provider=$1
  local action=$2

  case $provider in
    aws)
      scale_aws_resources "$action"
      ;;
    azure)
      scale_azure_resources "$action"
      ;;
    gcp)
      scale_gcp_resources "$action"
      ;;
    *)
      log "ERROR" "Unsupported provider: $provider"
      ;;
  esac
}

# Main scaling logic
main() {
  local provider=${1:-"aws"}
  local instance_id=${2:-""}
  local resource_group=${3:-""}
  local zone=${4:-""}

  log "INFO" "Starting scaling check for provider: ${provider}"

  # Get metrics
  metrics=$(get_metrics "$provider" "$instance_id" "$resource_group" "$zone")
  cpu_usage=$(echo "$metrics" | awk '{print $1}')
  memory_usage=$(echo "$metrics" | awk '{print $2}')

  # Ensure numeric values
  cpu_usage=${cpu_usage:-70}
  memory_usage=${memory_usage:-75}

  log "INFO" "Current CPU usage: ${cpu_usage}%"
  log "INFO" "Current memory usage: ${memory_usage}%"

  if (( $(echo "$cpu_usage > $THRESHOLD_CPU" | bc -l) )) || (( $(echo "$memory_usage > $THRESHOLD_MEMORY" | bc -l) )); then
    echo -e "${YELLOW}Thresholds exceeded. Scaling up...${NC}"
    log "INFO" "Thresholds exceeded. Initiating scale up."
    scale_resources "$provider" "up"
  elif (( $(echo "$cpu_usage < 30" | bc -l) )) && (( $(echo "$memory_usage < 40" | bc -l) )); then
    echo -e "${BLUE}Resources underutilized. Scaling down...${NC}"
    log "INFO" "Resources underutilized. Initiating scale down."
    scale_resources "$provider" "down"
  else
    echo -e "${GREEN}Resources are within optimal range. No scaling needed.${NC}"
    log "INFO" "Resources are within optimal range. No scaling needed."
  fi

  log "INFO" "Scaling check completed."
}

# Run main function with arguments
main "$@"
