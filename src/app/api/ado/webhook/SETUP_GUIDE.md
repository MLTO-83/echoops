# Azure DevOps Webhook Setup Guide

This guide walks you through setting up a webhook in Azure DevOps that triggers actions in EchoOps when work items are updated.

## Prerequisites

1. Administrative access to your Azure DevOps organization
2. A EchoOps project already set up with ADO connection
3. The webhook secret for your project

## Step 1: Access Service Hooks in Azure DevOps

1. Navigate to your Azure DevOps project
2. Go to **Project Settings** (gear icon in the bottom left)
3. Select **Service hooks** from the left sidebar

## Step 2: Create a New Subscription

1. Click the **+ Create subscription** button
2. Select **Web Hooks** from the list of service providers
3. Click **Next**

## Step 3: Configure the Trigger

1. Set **Trigger on this type of event** to "Work item updated"
2. Under **Filters**:
   - Set **Field** to "Assigned To" (to trigger when work items are assigned)
   - Leave other filters at their default values unless you need specific filtering
3. Click **Next**

## Step 4: Configure the Action

1. Set the **URL** to: `https://echoops.org/api/ado/webhook`
2. Leave **HTTP headers** empty
3. Set a custom header:
   - Name: `x-ado-signature`
   - Value: Copy the signature provided in your EchoOps project webhook settings
4. Under **Resource details to send** select **All**
5. Under **Messages to send** select **All**
6. Under **Detailed messages to send** select **All**
7. Set **RESOURCE VERSION** to **1.0**
8. Click **Test** to verify the configuration
9. Click **Finish** to save the webhook subscription

## Step 5: Testing the Webhook

1. Update a work item in your Azure DevOps project
2. Assign it to the Freja user account
3. Check the EchoOps application to verify that an AI agent job was created

## Troubleshooting

If the webhook isn't working correctly:

1. **Test with the diagnostic endpoint**:

   - Send a test payload to `https://echoops.org/api/ado/webhook/diagnose`
   - Review the response for detailed troubleshooting info

2. **Check the webhook signature**:

   - Verify the webhook secret is correct
   - Make sure the x-ado-signature header is properly formatted

3. **Verify project settings**:

   - Confirm your project exists in EchoOps
   - Check that the project name in EchoOps exactly matches the System.TeamProject field in ADO

4. **Review logs**:
   - Check the server logs for webhook-related errors
   - Look for "ADO Webhook" log entries

## Advanced: Using Postman for Testing

For detailed testing with Postman, refer to the `postman-test-setup.md` file in this directory.
