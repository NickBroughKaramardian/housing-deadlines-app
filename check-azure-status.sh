#!/bin/bash

echo "🔍 Checking Azure Status..."
echo "================================"

# Check if Azure CLI is working
echo "1. Checking Azure CLI..."
if command -v az &> /dev/null; then
    echo "✅ Azure CLI is installed"
    az --version | head -1
else
    echo "❌ Azure CLI not found"
    exit 1
fi

echo ""

# Check if we can reach Azure
echo "2. Testing Azure connectivity..."
if curl -s --connect-timeout 10 https://management.azure.com/ > /dev/null; then
    echo "✅ Can reach Azure management API"
else
    echo "❌ Cannot reach Azure management API (might be down)"
fi

echo ""

# Check if we're logged in
echo "3. Checking Azure login status..."
if az account show &> /dev/null; then
    echo "✅ Logged into Azure"
    echo "   Account: $(az account show --query user.name -o tsv)"
    echo "   Subscription: $(az account show --query name -o tsv)"
else
    echo "❌ Not logged into Azure"
    echo "   Run: az login"
fi

echo ""

# Check if we have a subscription
echo "4. Checking subscriptions..."
if az account list &> /dev/null; then
    SUB_COUNT=$(az account list --query "length(@)")
    if [ "$SUB_COUNT" -gt 0 ]; then
        echo "✅ Found $SUB_COUNT subscription(s)"
        az account list --query "[].{Name:name, State:state}" -o table
    else
        echo "❌ No subscriptions found"
        echo "   You need an Azure subscription to continue"
    fi
else
    echo "❌ Cannot list subscriptions (not logged in or Azure down)"
fi

echo ""
echo "================================"
echo "🎯 Next steps:"
echo "   - If Azure is up: Run 'az login' then continue with migration"
echo "   - If Azure is down: Wait and try again later"
echo "   - Check status: https://status.azure.com"





