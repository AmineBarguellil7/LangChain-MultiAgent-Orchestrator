# LangChain Multi-Agent Orchestrator

This project turns a local LangChain multi-agent research pipeline into a deployable FastAPI application. The app accepts a research topic, searches the web with Tavily, scrapes a useful source, generates a structured report with Groq, and returns critic feedback through an API and a small browser UI.

## Project Overview

The deployment journey followed four main steps:

1. FastAPI API layer: convert the local AI pipeline into a deployable web API.
2. Dockerize the app: package the API, frontend, and dependencies into a container.
3. Azure VM with Terraform: provision cloud infrastructure as code.
4. Deploy with Ansible: automate server setup and container deployment.

## Step 1 - FastAPI API Layer

The first step was to wrap the local AI pipeline in a FastAPI application so it could run as a web service instead of only as a local script.

The FastAPI layer is defined in `app.py` and connects to the pipeline in `src/pipelines/pipeline.py`.

Main API routes:

- `GET /` serves the browser UI from `frontend/index.html`.
- `GET /health` checks that the API is running.
- `POST /research` runs the multi-agent research pipeline for a submitted topic.

The `POST /research` endpoint accepts a JSON body like this:

```json
{
  "topic": "latest trends in AI agents"
}
```

It returns:

- the submitted topic
- Tavily search results
- a scraped content preview
- the generated research report
- critic feedback on the report

Run locally:

```powershell
pip install -r requirements.txt
uvicorn app:app --reload
```

Open the app at:

```text
http://127.0.0.1:8000
```

## Step 2 - Dockerize the App

The second step was to containerize the FastAPI application with Docker so it can run consistently on any machine or server.

The `Dockerfile` does the following:

- uses `python:3.11-slim` as the base image
- sets `/app` as the working directory
- installs system dependencies
- installs Python packages from `requirements.txt`
- copies the project files into the image
- exposes port `8000`
- starts the API with Uvicorn

Build the image:

```powershell
docker build -t langchain-multiagent-orchestrator .
```

Run the container:

```powershell
docker run --env-file .env -p 8000:8000 langchain-multiagent-orchestrator
```

The container runs the FastAPI server on:

```text
http://localhost:8000
```

Required environment variables:

```text
TAVILY_API_KEY=your_tavily_key
GROQ_API_KEY=your_groq_key
```

## Step 3 - Azure VM with Terraform

The third step was to create the cloud infrastructure using Terraform, so the server setup is repeatable and version-controlled.

The Terraform configuration is stored in the `terraform/` directory.

It provisions:

- an Azure resource group
- a virtual network
- a subnet
- a static public IP
- a network security group
- inbound SSH access on port `22`
- inbound FastAPI access on port `8000`
- a network interface
- an Ubuntu 22.04 Linux virtual machine

Run Terraform:

```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

After the VM is created, get the public IP:

```powershell
terraform output public_ip
```

That public IP is used for SSH, Ansible inventory, and accessing the deployed API.

## Step 4 - Deploy with Ansible

The final step was to use Ansible to automate the server setup and deploy the Dockerized app.

The Ansible files are stored in the `ansible/` directory:

- `ansible/inventory.ini` defines the target host group.
- `ansible/playbook.yml` contains the deployment tasks.

The current inventory uses a local connection:

```ini
[local]
localhost ansible_connection=local
```

This means the playbook runs on the machine where Ansible is executed. In this setup, it is used to prepare the Linux environment, authenticate with Azure Container Registry, pull the Docker image, and run the FastAPI container.

Ansible was used to handle the repeatable server tasks:

- update apt packages
- install Docker
- start and enable the Docker service
- log in to Azure Container Registry using credentials from `.env`
- pull the image from `amineacr.azurecr.io`
- remove the old `langchain-api` container if it already exists
- run the FastAPI container on port `8000`

The playbook uses these values:

```yaml
acr_registry: "amineacr.azurecr.io"
image_name: "langchain-multiagent:latest"
```

Required `.env` values for deployment:

```text
ACR_USERNAME=your_acr_username
ACR_PASSWORD=your_acr_password
TAVILY_API_KEY=your_tavily_key
GROQ_API_KEY=your_groq_key
```

Run the playbook from the project root so the `.env` file is available:

```powershell
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

After deployment, the app is available at:

```text
http://<azure-vm-public-ip>:8000
```

Health check:

```text
http://<azure-vm-public-ip>:8000/health
```

## End-to-End Flow

```text
User Topic
  -> FastAPI /research endpoint
  -> LangChain search agent
  -> Tavily web search
  -> URL scraping and content extraction
  -> Writer agent generates report
  -> Critic agent reviews report
  -> API returns report and feedback
```

## Tech Stack

- Python
- FastAPI
- LangChain
- Groq
- Tavily
- BeautifulSoup
- Trafilatura
- Docker
- Terraform
- Azure VM
- Ansible

## Useful Commands

Local API:

```powershell
uvicorn app:app --reload
```

Docker build:

```powershell
docker build -t langchain-multiagent-orchestrator .
```

Docker run:

```powershell
docker run --env-file .env -p 8000:8000 langchain-multiagent-orchestrator
```

Terraform deploy:

```powershell
cd terraform
terraform init
terraform apply
```

Ansible deploy:

```powershell
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```
