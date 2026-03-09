Mailersender how to setup
See env.local for api key
Firebase
About
Use this extension to send emails that contain the information from documents added to a specified Cloud Firestore collection. Adding a document triggers this extension to send an email built from the document's fields.

Setup
Install the extension
Console
Install this extension on your Firebase project using this link.

Firebase CLI
firebase ext:install mailersend/mailersend-email --project=[your-project-id]
Learn more about installing extensions in the Firebase Extensions documentation: console, CLI.

Use the extension
After its installation, this extension monitors all document writes to the EMAIL_COLLECTION collection. Email is sent based on the contents of the document's fields. The document's fields specify an email data.

Here's a basic example document write that would trigger this extension:

admin.firestore().collection('emails').add({
    to: [
      {
        email: 'recipient@example.com',
        name: 'Recipient name'
      }
    ],
    from: {
      email: 'from@example.com',
      name: 'From name'
    },
    cc: [
      {
        email: 'cc.recipient@example.com',
        name: 'CC recipient name'
      }
    ],
    bcc: [
      {
        email: 'bcc.recipient@example.com',
        name: 'Bcc recipient name'
      }
    ],
    subject: 'Hello from Firebase!',
    html: 'This is an HTML email body.',
    text: 'This is an TEXT email body.',
    template_id: 'abc123ced',
    variables: [
    {
        email: 'recipient@example.com',
        substitutions: [
        {
            var: 'variable_name',
            value: 'variable value'
        }
        ]
    }
    ],
    personalization: [
    {
        email: 'recipient@example.com',
        data: {
        personalization_name: 'personalization value'
        }
    }
    ],
    tags: ['tag1', 'tag2'],
    reply_to: {
    email: 'reply_to@example.com',
        name: 'Reply to name'
    },
    send_at: '123465789'
})
Additional setup
Before installing this extension, set up the following Firebase service in your Firebase project:

Cloud Firestore collection in your Firebase project.

Then, in the MailerSend dashboard:

Add a domain and verify it editing your DNS records.

Create a new API token with full access.