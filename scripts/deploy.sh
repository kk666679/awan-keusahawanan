#!/bin/bash
# Script to deploy the Next.js app to multiple cloud providers

set -e

# Configuration
APP_NAME=${APP_NAME:-"multi-cloud-app"}
ENVIRONMENT=${ENVIRONMENT:-"production"}
BUILD_DIR=${BUILD_DIR:-"./build"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to multi-cloud providers...${NC}"
echo "App Name: $APP_NAME"
echo "Environment: $ENVIRONMENT"
echo "Build Directory: $BUILD_DIR"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to deploy to AWS
deploy_aws() {
  echo -e "${YELLOW}Deploying to AWS...${NC}"

  if ! command_exists aws; then
    echo -e "${RED}AWS CLI not found. Please install AWS CLI first.${NC}"
    return 1
  fi

  # Check AWS credentials
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}AWS credentials not configured or invalid.${NC}"
    return 1
  fi

  # Build the application
  echo "Building application..."
  npm run build

  # Create S3 bucket if it doesn't exist
  BUCKET_NAME="${APP_NAME}-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
  aws s3 mb "s3://${BUCKET_NAME}" --region us-east-1

  # Upload build files to S3
  echo "Uploading files to S3 bucket: ${BUCKET_NAME}"
  aws s3 sync "${BUILD_DIR}" "s3://${BUCKET_NAME}" --delete

  # Enable static website hosting
  aws s3 website "s3://${BUCKET_NAME}" --index-document index.html --error-document error.html

  # Create CloudFront distribution (optional)
  if [ "$CREATE_CLOUDFRONT" = "true" ]; then
    echo "Creating CloudFront distribution..."
    DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config "{
      \"CallerReference\": \"${APP_NAME}-${ENVIRONMENT}\",
      \"Origins\": {
        \"Quantity\": 1,
        \"Items\": {
          \"Id\": \"S3-${BUCKET_NAME}\",
          \"DomainName\": \"${BUCKET_NAME}.s3.amazonaws.com\",
          \"S3OriginConfig\": {
            \"OriginAccessIdentity\": \"\"
          }
        }
      },
      \"DefaultCacheBehavior\": {
        \"TargetOriginId\": \"S3-${BUCKET_NAME}\",
        \"ViewerProtocolPolicy\": \"redirect-to-https\",
        \"MinTTL\": 0,
        \"ForwardedValues\": {
          \"QueryString\": false,
          \"Cookies\": {
            \"Forward\": \"none\"
          }
        }
      },
      \"Comment\": \"${APP_NAME} ${ENVIRONMENT} distribution\",
      \"Enabled\": true
    }" --query 'Distribution.Id' --output text)

    echo -e "${GREEN}AWS deployment completed!${NC}"
    echo "S3 Bucket: ${BUCKET_NAME}"
    echo "CloudFront URL: https://${DISTRIBUTION_ID}.cloudfront.net"
  else
    echo -e "${GREEN}AWS deployment completed!${NC}"
    echo "S3 Website URL: http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"
  fi
}

# Function to deploy to Azure
deploy_azure() {
  echo -e "${YELLOW}Deploying to Azure...${NC}"

  if ! command_exists az; then
    echo -e "${RED}Azure CLI not found. Please install Azure CLI first.${NC}"
    return 1
  fi

  # Check Azure login
  if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
    return 1
  fi

  # Build the application
  echo "Building application..."
  npm run build

  # Set variables
  RESOURCE_GROUP="${APP_NAME}-rg"
  STORAGE_ACCOUNT="${APP_NAME}storage${RANDOM}"
  CONTAINER_NAME="${APP_NAME}-container"

  # Create resource group
  echo "Creating resource group: ${RESOURCE_GROUP}"
  az group create --name "${RESOURCE_GROUP}" --location eastus

  # Create storage account
  echo "Creating storage account: ${STORAGE_ACCOUNT}"
  az storage account create --name "${STORAGE_ACCOUNT}" --resource-group "${RESOURCE_GROUP}" --sku Standard_LRS

  # Get storage account key
  ACCOUNT_KEY=$(az storage account keys list --resource-group "${RESOURCE_GROUP}" --account-name "${STORAGE_ACCOUNT}" --query '[0].value' -o tsv)

  # Create container
  echo "Creating blob container: ${CONTAINER_NAME}"
  az storage container create --name "${CONTAINER_NAME}" --account-name "${STORAGE_ACCOUNT}" --account-key "${ACCOUNT_KEY}"

  # Upload files
  echo "Uploading files to Azure Blob Storage..."
  az storage blob upload-batch --destination "${CONTAINER_NAME}" --source "${BUILD_DIR}" --account-name "${STORAGE_ACCOUNT}" --account-key "${ACCOUNT_KEY}"

  # Enable static website
  az storage blob service-properties update --account-name "${STORAGE_ACCOUNT}" --account-key "${ACCOUNT_KEY}" --static-website --index-document index.html --error-document-404-path error.html

  # Get website URL
  WEBSITE_URL=$(az storage account show --name "${STORAGE_ACCOUNT}" --resource-group "${RESOURCE_GROUP}" --query "primaryEndpoints.web" -o tsv)

  echo -e "${GREEN}Azure deployment completed!${NC}"
  echo "Resource Group: ${RESOURCE_GROUP}"
  echo "Storage Account: ${STORAGE_ACCOUNT}"
  echo "Website URL: ${WEBSITE_URL}"
}

# Function to deploy to GCP
deploy_gcp() {
  echo -e "${YELLOW}Deploying to GCP...${NC}"

  if ! command_exists gsutil; then
    echo -e "${RED}gsutil not found. Please install Google Cloud SDK first.${NC}"
    return 1
  fi

  # Check GCP authentication
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 >/dev/null; then
    echo -e "${RED}Not authenticated with GCP. Please run 'gcloud auth login' first.${NC}"
    return 1
  fi

  # Build the application
  echo "Building application..."
  npm run build

  # Set variables
  PROJECT_ID=$(gcloud config get-value project)
  BUCKET_NAME="${APP_NAME}-${ENVIRONMENT}-${PROJECT_ID}"

  # Create bucket
  echo "Creating GCS bucket: ${BUCKET_NAME}"
  gsutil mb -p "${PROJECT_ID}" "gs://${BUCKET_NAME}"

  # Upload files
  echo "Uploading files to Google Cloud Storage..."
  gsutil -m rsync -r "${BUILD_DIR}" "gs://${BUCKET_NAME}"

  # Make bucket public
  gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"

  # Enable website
  gsutil web set -m index.html -e error.html "gs://${BUCKET_NAME}"

  echo -e "${GREEN}GCP deployment completed!${NC}"
  echo "Project ID: ${PROJECT_ID}"
  echo "Bucket: ${BUCKET_NAME}"
  echo "Website URL: https://storage.googleapis.com/${BUCKET_NAME}/index.html"
}

# Main deployment logic
case "${1:-all}" in
  "aws")
    deploy_aws
    ;;
  "azure")
    deploy_azure
    ;;
  "gcp")
    deploy_gcp
    ;;
  "all")
    echo "Deploying to all cloud providers..."
    deploy_aws || echo -e "${RED}AWS deployment failed${NC}"
    deploy_azure || echo -e "${RED}Azure deployment failed${NC}"
    deploy_gcp || echo -e "${RED}GCP deployment failed${NC}"
    ;;
  *)
    echo -e "${RED}Usage: $0 {aws|azure|gcp|all}${NC}"
    exit 1
    ;;
esac

echo -e "${GREEN}Deployment process completed!${NC}"
