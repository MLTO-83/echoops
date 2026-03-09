# Objective

Implement a management interface for the AI developer agent (Freja) on the project page in the Portvita app. Additionally, introduce a settings function where users can define which AI provider to use (e.g., OpenAI or Google Gemini), along with API credentials and model version.

## Scope

1. Project Page – AI Agent (Freja) Management
   Add a new section to each project page with the following functionality:

Prompt Input:
Multi-line input where the user describes what the agent should build (e.g., “Create a TypeScript service that validates Danish CPR numbers”).

Repository Selector:
Dropdown or autocomplete list of available Azure DevOps repositories linked to the project.

Submit Button:
Triggers the backend workflow to:

Combine prompt and metadata.

Call selected AI provider to generate code.

Create a new branch, commit code, and open a pull request in the selected repo.

Status Feedback:
Display generation and PR status (e.g., success, failure, link to PR).

2. AI Provider Settings UI
   Create a global settings page (depending on what fits the architecture) where the user can configure AI integration:

Fields:

AI Provider (dropdown): OpenAI, Google Gemini (support others later)

API Key (input – secured, not shown after save)

Model (input or dropdown – e.g., GPT-4o, gemini-1.5-pro)

Default temperature (optional – slider/input)

Max tokens (optional)

Select the user that is the ai agent

Functionality:

Save configuration to secure storage in the db.

Validate provider and key (e.g., optional test connection button).

Backend Requirements
POST /api/ai/execute

Accepts: prompt, repo, project ID.

Fetches project settings to determine which AI provider/model to use.

Sends prompt to the selected AI service.

Interacts with ADO to:

Create branch.

Commit code.

Create pull request.

POST /api/settings/ai-provider

Save AI provider configuration securely.

GET /api/settings/ai-provider

Return current configuration for UI display (mask API key).

Deliverables
Freja management UI on project page (prompt input, repo selector, status feedback).

AI provider settings UI (provider, API key, model, optional settings).

Backend services for executing prompt, storing settings, and handling integration with OpenAI/Gemini and Azure DevOps.

Basic error handling and logging for all integrations.

Documentation for setting up AI providers and required credentials.

# DB

Make sure that the db models a align with this change and in the user model add licenstype with 3 values

1. Free Licens
1. Basic Licens
1. AI Agent Licens

# New logic to select ai provider

The user should be select provider and the providers models with to drop down manus:
| AI Provider | Tilgængelige Models |
|-------------|----------------------|
| Anthropic | - claude-3-7-sonnet-20250219<br>- claude-3-5-sonnet-20241022<br>- claude-3-5-haiku-20241022<br>- claude-3-opus-20240229<br>- claude-3-haiku-20240307 |
| Google Gemini | - gemini-2.5-pro-exp-03-25<br>- gemini-2.5-pro-preview-03-25<br>- gemini-2.5-flash-preview-04-17<br>- gemini-2.0-flash-001<br>- gemini-2.0-flash-lite-preview-02-05<br>- gemini-2.0-pro-exp-02-05<br>- gemini-2.0-flash-thinking-exp-02-21<br>- gemini-2.0-flash-thinking-exp-1219 |
| DeepSeek | - deepseek-chat<br>- deepseek-reasoner |
| OpenAI | - gpt-4.1<br>- gpt-4.1-mini<br>- gpt-4.1-nano<br>- o3-mini<br>- o3<br>- o1<br>- o1-preview<br>- o1-mini |
