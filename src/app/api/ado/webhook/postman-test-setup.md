# Testing ADO Webhook with Postman

## Basic Setup

1. Create a new POST request in Postman
2. URL: https://echoops.org/api/ado/webhook
3. Headers:
   - Content-Type: application/json; charset=utf-8
   - x-ado-signature: (Generate using pre-request script below)

## Pre-Request Script for Signature Generation

```javascript
// Get the raw request body
const payload = pm.request.body.raw;
const secret = "your-webhook-secret"; // Replace with your actual webhook secret

// Calculate SHA-256 signature
const signature = CryptoJS.HmacSHA256(payload, secret).toString();
console.log("Generated SHA-256 signature:", signature);

// Set the signature header
pm.request.headers.upsert({
  key: "x-ado-signature",
  value: signature,
});
```

## Sample Request Body (Actual ADO Format)

```json
{
  "subscriptionId": "8e04ca2a-f1d6-4e29-afdc-d43b5e0d0ef9",
  "notificationId": 21,
  "id": "27646e0e-b520-4d2b-9411-bba7524947cd",
  "eventType": "workitem.updated",
  "publisherId": "tfs",
  "message": {
    "text": "Bug #5 (Some great new idea!) updated by Jamal Hartnett.\r\n(http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&id=5)",
    "html": "<a href=\"http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&amp;id=5\">Bug #5</a> (Some great new idea!) updated by Jamal Hartnett.",
    "markdown": "[Bug #5](http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&id=5) (Some great new idea!) updated by Jamal Hartnett."
  },
  "detailedMessage": {
    "text": "Bug #5 (Some great new idea!) updated by Jamal Hartnett.\r\n(http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&id=5)\r\n\r\n- New State: Approved\r\n",
    "html": "<a href=\"http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&amp;id=5\">Bug #5</a> (Some great new idea!) updated by Jamal Hartnett.<ul>\r\n<li>New State: Approved</li></ul>",
    "markdown": "[Bug #5](http://fabrikam-fiber-inc.visualstudio.com/web/wi.aspx?pcguid=74e918bf-3376-436d-bd20-8e8c1287f465&id=5) (Some great new idea!) updated by Jamal Hartnett.\r\n\r\n* New State: Approved\r\n"
  },
  "resource": {
    "id": 2,
    "workItemId": 0,
    "rev": 2,
    "revisedBy": {
      "id": "e5a5f7f8-6507-4c34-b397-6c4818e002f4",
      "displayName": "Jamal Hartnett",
      "url": "https://vssps.dev.azure.com/fabrikam/_apis/Identities/e5a5f7f8-6507-4c34-b397-6c4818e002f4",
      "_links": {
        "avatar": {
          "href": "https://dev.azure.com/mseng/_apis/GraphProfile/MemberAvatars/aad.YTkzODFkODYtNTYxYS03ZDdiLWJjM2QtZDUzMjllMjM5OTAz"
        }
      },
      "uniqueName": "Jamal Hartnett",
      "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=e5a5f7f8-6507-4c34-b397-6c4818e002f4",
      "descriptor": "ukn.VXkweExUVXRNakV0TWpFME5qYzNNekE0TlMwNU1ETXpOak15T0RVdE56RTVNelEwTnpBM0xURXpPRGswTlRN"
    },
    "revisedDate": "0001-01-01T00:00:00",
    "fields": {
      "System.Rev": {
        "oldValue": "1",
        "newValue": "2"
      },
      "System.AuthorizedDate": {
        "oldValue": "2014-07-15T16:48:44.663Z",
        "newValue": "2014-07-15T17:42:44.663Z"
      },
      "System.RevisedDate": {
        "oldValue": "2014-07-15T17:42:44.663Z",
        "newValue": "9999-01-01T00:00:00Z"
      },
      "System.State": {
        "oldValue": "New",
        "newValue": "Approved"
      },
      "System.Reason": {
        "oldValue": "New defect reported",
        "newValue": "Approved by the Product Owner"
      },
      "System.AssignedTo": {
        "oldValue": "unassigned",
        "newValue": {
          "displayName": "Freja",
          "id": "e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "uniqueName": "Freja"
        }
      },
      "System.ChangedDate": {
        "oldValue": "2014-07-15T16:48:44.663Z",
        "newValue": "2014-07-15T17:42:44.663Z"
      },
      "System.Watermark": {
        "oldValue": "2",
        "newValue": "5"
      },
      "Microsoft.VSTS.Common.Severity": {
        "oldValue": "3 - Medium",
        "newValue": "2 - High"
      }
    },
    "_links": {
      "self": {
        "href": "http://fabrikam-fiber-inc.visualstudio.com/DefaultCollection/_apis/wit/workItems/5/updates/2"
      },
      "parent": {
        "href": "http://fabrikam-fiber-inc.visualstudio.com/DefaultCollection/_apis/wit/workItems/5"
      },
      "workItemUpdates": {
        "href": "http://fabrikam-fiber-inc.visualstudio.com/DefaultCollection/_apis/wit/workItems/5/updates/2"
      }
    },
    "url": "http://fabrikam-fiber-inc.visualstudio.com/DefaultCollection/_apis/wit/workItems/5/updates/2",
    "revision": {
      "id": 5,
      "rev": 2,
      "fields": {
        "System.AreaPath": "FabrikamCloud",
        "System.TeamProject": "YourProjectName",
        "System.IterationPath": "FabrikamCloud\\Release 1\\Sprint 1",
        "System.WorkItemType": "Bug",
        "System.State": "New",
        "System.Reason": "New defect reported",
        "System.CreatedDate": "2014-07-15T16:48:44.663Z",
        "System.CreatedBy": {
          "displayName": "Jamal Hartnett",
          "url": "https://vssps.dev.azure.com/fabrikam/_apis/Identities/e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "_links": {
            "avatar": {
              "href": "https://dev.azure.com/mseng/_apis/GraphProfile/MemberAvatars/aad.YTkzODFkODYtNTYxYS03ZDdiLWJjM2QtZDUzMjllMjM5OTAz"
            }
          },
          "id": "e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "uniqueName": "Jamal Hartnett",
          "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "descriptor": "ukn.VXkweExUVXRNakV0TWpFME5qYzNNekE0TlMwNU1ETXpOak15T0RVdE56RTVNelEwTnpBM0xURXpPRGswTlRN"
        },
        "System.ChangedDate": "2014-07-15T16:48:44.663Z",
        "System.ChangedBy": {
          "displayName": "Jamal Hartnett",
          "url": "https://vssps.dev.azure.com/fabrikam/_apis/Identities/e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "_links": {
            "avatar": {
              "href": "https://dev.azure.com/mseng/_apis/GraphProfile/MemberAvatars/aad.YTkzODFkODYtNTYxYS03ZDdiLWJjM2QtZDUzMjllMjM5OTAz"
            }
          },
          "id": "e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "uniqueName": "Jamal Hartnett",
          "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "descriptor": "ukn.VXkweExUVXRNakV0TWpFME5qYzNNekE0TlMwNU1ETXpOak15T0RVdE56RTVNelEwTnpBM0xURXpPRGswTlRN"
        },
        "System.Title": "Some great new idea!",
        "System.Description": "This is the description of the work item",
        "System.AssignedTo": {
          "displayName": "Freja",
          "id": "e5a5f7f8-6507-4c34-b397-6c4818e002f4",
          "uniqueName": "Freja"
        },
        "Microsoft.VSTS.Common.Severity": "3 - Medium",
        "WEF_EB329F44FE5F4A94ACB1DA153FDF38BA_Kanban.Column": "New"
      },
      "url": "http://fabrikam-fiber-inc.visualstudio.com/DefaultCollection/_apis/wit/workItems/5/revisions/2"
    }
  },
  "resourceVersion": "1.0",
  "resourceContainers": {
    "collection": {
      "id": "c12d0eb8-e382-443b-9f9c-c52cba5014c2"
    },
    "account": {
      "id": "f844ec47-a9db-4511-8281-8b63f4eaf94e"
    },
    "project": {
      "id": "be9b3917-87e6-42a4-a549-2bc06a7a878f"
    }
  },
  "createdDate": "2025-05-06T19:05:10.8266397Z"
}
```

> **Important Note**: Replace `"YourProjectName"` in the `System.TeamProject` field with an actual project name that exists in your EchoOps database. This is crucial for successfully processing the webhook.

## Customizing for Your Environment

When testing with this payload, make these modifications to ensure it works with your setup:

1. Change `"System.TeamProject"` to match a project name in your EchoOps database
2. Set `"System.AssignedTo"` to have the display name `"Freja"` (as shown in the example)
3. Update the `"System.Description"` field if you want to test specific content
4. The test will work best if the `"id"` value is kept as `"27646e0e-b520-4d2b-9411-bba7524947cd"` since our code has special handling for this test ID

## Validating Responses

- **Success**: You should receive a 200 OK response with a message indicating the job was created
- **Auth Error**: If signature validation fails, you'll get a 401 Unauthorized response
- **Project Not Found**: If the System.TeamProject name doesn't exist in your database, you'll get a 404 Not Found response

## Testing in Stages

1. First test with the diagnostic endpoint (`/api/ado/webhook/diagnose`) to verify payload and signature
2. Then test with the actual webhook endpoint (`/api/ado/webhook`) when you're ready to create a job
