#!/bin/bash

# Azure Functions Cost Checker Script
# This script checks your current Azure Functions Consumption Plan costs and usage

set -e

echo "=========================================="
echo "Azure Functions Cost Checker"
echo "=========================================="
echo ""

# Configuration - UPDATE THESE VALUES
RESOURCE_GROUP="cc-project-manager"  # Your resource group name
FUNCTION_APP="cc-project-api"        # Your function app name

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed."
    echo "Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "⚠️  Not logged in to Azure. Logging in..."
    az login
fi

echo "✅ Azure CLI is ready"
echo ""

# Get subscription info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "📋 Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
echo ""

# Check if Function App exists
echo "🔍 Checking Function App: $FUNCTION_APP..."
if ! az functionapp show --name $FUNCTION_APP --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "❌ Function App '$FUNCTION_APP' not found in resource group '$RESOURCE_GROUP'"
    echo ""
    echo "Available Function Apps:"
    az functionapp list --query "[].{Name:name, ResourceGroup:resourceGroup}" --output table
    exit 1
fi

# Get Function App details
echo "✅ Function App found"
echo ""

# Get App Service Plan info
PLAN_ID=$(az functionapp show \
    --name $FUNCTION_APP \
    --resource-group $RESOURCE_GROUP \
    --query appServicePlanId \
    --output tsv)

PLAN_NAME=$(echo $PLAN_ID | awk -F/ '{print $NF}')
PLAN_RESOURCE_GROUP=$(echo $PLAN_ID | awk -F/ '{print $(NF-3)}')

echo "📊 App Service Plan Details:"
az appservice plan show \
    --name $PLAN_NAME \
    --resource-group $PLAN_RESOURCE_GROUP \
    --query "{Name:name, Kind:kind, Tier:'sku.tier', Size:'sku.size', Capacity:'sku.capacity'}" \
    --output table

echo ""

# Check plan type
PLAN_KIND=$(az appservice plan show \
    --name $PLAN_NAME \
    --resource-group $PLAN_RESOURCE_GROUP \
    --query kind \
    --output tsv)

if [ "$PLAN_KIND" == "functionapp" ]; then
    PLAN_TIER=$(az appservice plan show \
        --name $PLAN_NAME \
        --resource-group $PLAN_RESOURCE_GROUP \
        --query "sku.tier" \
        --output tsv)
    
    if [ "$PLAN_TIER" == "Dynamic" ] || [ "$PLAN_TIER" == "Y1" ]; then
        echo "✅ Plan Type: Consumption Plan"
        echo "   - Pay-per-use pricing"
        echo "   - Cold starts possible after inactivity"
        echo ""
    elif [ "$PLAN_TIER" == "ElasticPremium" ] || [ "$PLAN_TIER" == "EP1" ] || [ "$PLAN_TIER" == "EP2" ] || [ "$PLAN_TIER" == "EP3" ]; then
        echo "✅ Plan Type: Premium Plan ($PLAN_TIER)"
        echo "   - Fixed monthly cost"
        echo "   - No cold starts"
        echo ""
    else
        echo "⚠️  Plan Type: $PLAN_TIER"
        echo ""
    fi
else
    echo "⚠️  Plan Kind: $PLAN_KIND"
    echo ""
fi

# Get current month's metrics
echo "📈 Current Month Usage Metrics:"
echo ""

# Calculate date range (start of current month to now)
START_DATE=$(date -u -d "$(date +%Y-%m-01)" +%Y-%m-%dT00:00:00Z)
END_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Get Function App resource ID
FUNCTION_APP_ID=$(az functionapp show \
    --name $FUNCTION_APP \
    --resource-group $RESOURCE_GROUP \
    --query id \
    --output tsv)

echo "   Time Range: $START_DATE to $END_DATE"
echo ""

# Get execution count
echo "🔢 Function Executions:"
EXECUTION_COUNT=$(az monitor metrics list \
    --resource $FUNCTION_APP_ID \
    --metric "FunctionExecutionCount" \
    --start-time $START_DATE \
    --end-time $END_DATE \
    --aggregation Total \
    --query "[0].timeseries[0].data[-1].total" \
    --output tsv 2>/dev/null || echo "0")

if [ -z "$EXECUTION_COUNT" ] || [ "$EXECUTION_COUNT" == "null" ]; then
    EXECUTION_COUNT="0"
fi

echo "   Total Executions: $EXECUTION_COUNT"
echo ""

# Get execution units (GB-seconds)
echo "💾 Execution Units (GB-seconds):"
EXECUTION_UNITS=$(az monitor metrics list \
    --resource $FUNCTION_APP_ID \
    --metric "FunctionExecutionUnits" \
    --start-time $START_DATE \
    --end-time $END_DATE \
    --aggregation Total \
    --query "[0].timeseries[0].data[-1].total" \
    --output tsv 2>/dev/null || echo "0")

if [ -z "$EXECUTION_UNITS" ] || [ "$EXECUTION_UNITS" == "null" ]; then
    EXECUTION_UNITS="0"
fi

echo "   Total GB-seconds: $EXECUTION_UNITS"
echo ""

# Calculate estimated cost (Consumption Plan pricing)
if [ "$PLAN_TIER" == "Dynamic" ] || [ "$PLAN_TIER" == "Y1" ]; then
    echo "💰 Estimated Cost Calculation:"
    echo ""
    
    # Consumption Plan Pricing (as of 2024):
    # - Execution Time: $0.000016 per GB-second
    # - Execution Count: First 1M free, then $0.20 per million
    
    EXECUTION_COST=$(echo "scale=6; $EXECUTION_UNITS * 0.000016" | bc)
    
    if (( $(echo "$EXECUTION_COUNT > 1000000" | bc -l) )); then
        EXCESS_EXECUTIONS=$(echo "scale=0; $EXECUTION_COUNT - 1000000" | bc)
        EXECUTION_COUNT_COST=$(echo "scale=6; $EXCESS_EXECUTIONS / 1000000 * 0.20" | bc)
    else
        EXECUTION_COUNT_COST=0
    fi
    
    TOTAL_COST=$(echo "scale=6; $EXECUTION_COST + $EXECUTION_COUNT_COST" | bc)
    
    echo "   Execution Time Cost: \$$(printf "%.4f" $EXECUTION_COST)"
    if (( $(echo "$EXECUTION_COUNT_COST > 0" | bc -l) )); then
        echo "   Execution Count Cost: \$$(printf "%.4f" $EXECUTION_COUNT_COST)"
    else
        echo "   Execution Count Cost: \$0.00 (within free tier)"
    fi
    echo "   ─────────────────────────────"
    echo "   Estimated Total: \$$(printf "%.4f" $TOTAL_COST)"
    echo ""
    
    if (( $(echo "$TOTAL_COST < 0.01" | bc -l) )); then
        echo "   💡 Your costs are essentially FREE this month!"
    elif (( $(echo "$TOTAL_COST < 5" | bc -l) )); then
        echo "   💡 Very low cost - Consumption plan is cost-effective"
    else
        echo "   ⚠️  Consider monitoring costs - may want to evaluate Premium plan"
    fi
    echo ""
fi

# Get actual billing costs (requires Cost Management API access)
echo "💳 Actual Billing Costs (from Azure Cost Management):"
echo "   Note: This requires Cost Management API access"
echo "   Check in Azure Portal: Cost Management + Billing → Cost analysis"
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Function App: $FUNCTION_APP"
echo "Resource Group: $RESOURCE_GROUP"
echo "Plan: $PLAN_NAME ($PLAN_TIER)"
echo "Executions (this month): $EXECUTION_COUNT"
echo "GB-seconds (this month): $EXECUTION_UNITS"
if [ "$PLAN_TIER" == "Dynamic" ] || [ "$PLAN_TIER" == "Y1" ]; then
    echo "Estimated Cost: \$$(printf "%.4f" $TOTAL_COST)"
fi
echo ""
echo "✅ Cost check complete!"
echo ""
echo "💡 Tip: Run this script monthly to track costs over time"

