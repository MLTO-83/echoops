# Task: Implement Email Sending via Exchange Online in a Next.js App

Objective: Develop a feature to enable sending emails via an Exchange Online Connector in a Next.js application. The solution should leverage an API route in Next.js for secure email handling.

# Requirements:

API Route Setup:

Create an API route in Next.js under /pages/api/send-email.js.

Use the nodemailer library to handle SMTP email sending.

Configure the SMTP connection to use Exchange Online (e.g., smtp.office365.com, port 587 with TLS).

# Functionality:

The API route should accept a POST request containing the following parameters in the request body:

to (users email address)

subject (Portavi user validation)

text (email body with link to validation check)

Validate the input to ensure required fields are provided.

# Security:

Use environment variables to securely store sensitive information like:

SMTP username (legal@portavi.eu)

SMTP password (xx)

# Testing and Error Handling:

Ensure that successful email sending returns a 200 response with a success message.

Implement error handling to return appropriate error messages (e.g., 500 error for server issues or input validation errors).

# Documentation:

Provide clear comments in the code explaining key steps.

Write a brief README outlining how to configure and test the feature.

# Deliverables:

1. API route implemented as described.

1. Frontend integration with the ability to send test emails.

1. Documentation on setup, configuration, and usage.
