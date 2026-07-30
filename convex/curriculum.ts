import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireTeacher } from "./_lib/auth";

type LessonBlock =
  | { type: "heading" | "paragraph" | "list" | "code"; content: string }
  | { type: "crossword"; pairs: Array<{ term: string; definition: string }> };

type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

type CurriculumLesson = {
  title: string;
  type: "content" | "quiz" | "mandatory";
  order: number;
  blocks: LessonBlock[];
  questions?: QuizQuestion[];
};

type Homework = {
  title: string;
  description: string;
  dueInDays: number;
};

type CurriculumTrack = {
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  lessons: CurriculumLesson[];
  homework: Homework[];
};

const DEVOPS_TRACKS: CurriculumTrack[] = [
  {
    name: "Linux Administration",
    slug: "linux",
    description: "Build job-ready Linux administration, networking, service management, and Bash automation skills.",
    color: "#F59E0B",
    icon: "terminal",
    order: 1,
    lessons: [
      {
        title: "Linux Networking and Services",
        type: "quiz",
        order: 4,
        blocks: [
          { type: "heading", content: "Operating Linux in Production" },
          { type: "paragraph", content: "Cloud engineers use Linux networking and service-management tools every day. Learn how hosts communicate, how ports expose services, and how systemd keeps applications running." },
          { type: "list", content: "ip addr — inspect network interfaces and addresses\nping — test whether a host is reachable\nss -tulpn — inspect listening ports\nsystemctl status nginx — inspect a service\njournalctl -u nginx — read service logs\nssh user@host — securely access a remote server\ncurl https://example.com — test an HTTP endpoint" },
        ],
        questions: [
          {
            question: "Which command manages systemd services?",
            options: ["systemctl", "chmod", "grep", "tar"],
            correctIndex: 0,
            explanation: "systemctl starts, stops, enables, disables, and inspects systemd services.",
          },
          {
            question: "Which protocol is commonly used for secure remote Linux access?",
            options: ["FTP", "SSH", "SMTP", "SNMP"],
            correctIndex: 1,
            explanation: "SSH encrypts remote shell sessions and commonly listens on TCP port 22.",
          },
        ],
      },
      {
        title: "Bash Automation Lab",
        type: "content",
        order: 5,
        blocks: [
          { type: "heading", content: "Automate Repetitive Administration" },
          { type: "paragraph", content: "Bash scripts turn repeatable command-line procedures into reliable automation. This lab introduces variables, conditionals, loops, exit codes, and scheduled jobs." },
          { type: "code", content: "#!/usr/bin/env bash\nset -euo pipefail\nBACKUP_DIR=\"/var/backups/app\"\nmkdir -p \"$BACKUP_DIR\"\ntar -czf \"$BACKUP_DIR/app-$(date +%F).tar.gz\" /opt/app\nfind \"$BACKUP_DIR\" -type f -mtime +7 -delete\necho \"Backup complete\"" },
          { type: "list", content: "Use set -euo pipefail to stop on common errors\nQuote variables to avoid word-splitting bugs\nCheck command exit codes before continuing\nUse cron or systemd timers for scheduled automation\nWrite logs so failures can be investigated" },
        ],
      },
      {
        title: "Linux Administration Crossword Challenge",
        type: "mandatory",
        order: 6,
        blocks: [
          { type: "heading", content: "Linux Administration Crossword" },
          { type: "paragraph", content: "Review the Linux concepts used by cloud and DevOps engineers. Correct answers lock into place." },
          {
            type: "crossword",
            pairs: [
              { term: "KERNEL", definition: "The operating-system core that manages hardware, memory, and processes" },
              { term: "TERMINAL", definition: "The application used to interact with a command-line shell" },
              { term: "PERMISSION", definition: "Read, write, or execute access assigned to a file" },
              { term: "SYSTEMD", definition: "The service manager used by many Linux distributions" },
              { term: "SHELL", definition: "A command interpreter such as Bash" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Linux Server Health Report",
        description: "Use Linux commands to document disk usage, memory, running services, network interfaces, and the five highest-CPU processes. Submit the commands and a short explanation of your findings.",
        dueInDays: 7,
      },
      {
        title: "Homework: Bash Backup Automation",
        description: "Write and test a Bash script that creates a timestamped backup, logs success or failure, and removes backups older than seven days.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "AWS Cloud",
    slug: "aws",
    description: "Design secure, highly available AWS environments with core compute, storage, networking, database, monitoring, and serverless services.",
    color: "#FF9900",
    icon: "cloud",
    order: 2,
    lessons: [
      {
        title: "AWS Core Services and Shared Responsibility",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Build on AWS" },
          { type: "paragraph", content: "AWS provides on-demand infrastructure across global Regions and Availability Zones. Cloud engineers combine managed services while following least privilege, resilience, and cost-awareness." },
          { type: "list", content: "IAM — users, roles, policies, and least-privilege access\nEC2 — virtual machines and launch templates\nS3 — durable object storage\nVPC — isolated cloud networks\nRDS — managed relational databases\nLambda — event-driven serverless compute\nCloudWatch — metrics, logs, alarms, and dashboards\nSNS and SQS — messaging and decoupling\nCloudFormation — AWS-native infrastructure as code" },
        ],
      },
      {
        title: "Designing a Highly Available AWS Environment",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Availability, Networking, and Scaling" },
          { type: "paragraph", content: "A production web application can span multiple Availability Zones, use an Application Load Balancer, scale EC2 capacity automatically, and store data in a Multi-AZ database." },
          { type: "list", content: "Public subnets host internet-facing load balancers\nPrivate subnets protect application and database resources\nRoute tables decide where network traffic flows\nSecurity groups provide stateful instance-level firewall rules\nAuto Scaling replaces unhealthy instances and responds to demand\nRoute 53 provides DNS and health-aware routing" },
        ],
        questions: [
          {
            question: "Which AWS service distributes HTTP traffic across multiple targets?",
            options: ["Application Load Balancer", "S3 Glacier", "IAM", "CloudFormation"],
            correctIndex: 0,
            explanation: "An Application Load Balancer distributes application traffic across healthy targets.",
          },
          {
            question: "Where should a production database normally be placed?",
            options: ["A public subnet", "A private subnet", "An S3 bucket", "An internet gateway"],
            correctIndex: 1,
            explanation: "Private subnets prevent direct inbound access from the public internet.",
          },
        ],
      },
      {
        title: "AWS Cloud Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "AWS Cloud Crossword" },
          { type: "paragraph", content: "Use the clues to review foundational AWS services." },
          {
            type: "crossword",
            pairs: [
              { term: "IAM", definition: "AWS service for identities, roles, and access policies" },
              { term: "EC2", definition: "AWS virtual-machine compute service" },
              { term: "VPC", definition: "A logically isolated network in AWS" },
              { term: "ROUTE53", definition: "AWS managed DNS service" },
              { term: "CLOUDWATCH", definition: "AWS service for metrics, logs, alarms, and dashboards" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Design a Highly Available AWS Web App",
        description: "Create an architecture diagram with a VPC, two Availability Zones, public and private subnets, an Application Load Balancer, Auto Scaling, RDS, Route 53, and CloudWatch. Explain each security boundary.",
        dueInDays: 14,
      },
      {
        title: "Homework: AWS Least-Privilege IAM Policy",
        description: "Write and explain an IAM policy that permits read-only access to one S3 bucket while denying access to every other bucket.",
        dueInDays: 21,
      },
    ],
  },
  {
    name: "Microsoft Azure",
    slug: "azure",
    description: "Deploy and secure Azure compute, storage, identity, networking, and monitoring resources.",
    color: "#0078D4",
    icon: "cloud",
    order: 3,
    lessons: [
      {
        title: "Azure Foundations",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Core Azure Building Blocks" },
          { type: "paragraph", content: "Azure organizes cloud resources into subscriptions, resource groups, Regions, and Availability Zones. Engineers use these boundaries for access, billing, lifecycle management, and resilience." },
          { type: "list", content: "Virtual Machines — Windows and Linux compute\nStorage Accounts — blobs, files, queues, and tables\nVirtual Networks — private IP space and subnetting\nNetwork Security Groups — traffic rules\nMicrosoft Entra ID — cloud identity and access\nAzure Monitor — metrics, logs, alerts, and workbooks\nKey Vault — protected secrets, keys, and certificates" },
        ],
      },
      {
        title: "Secure Azure Networking",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Control Traffic and Identity" },
          { type: "paragraph", content: "Azure Virtual Networks isolate resources. Subnets, route tables, Network Security Groups, private endpoints, and managed identities reduce unnecessary public exposure." },
        ],
        questions: [
          {
            question: "Which Azure feature filters inbound and outbound subnet traffic?",
            options: ["Network Security Group", "Resource Group", "Blob Container", "Availability Set"],
            correctIndex: 0,
            explanation: "Network Security Groups contain allow and deny rules for network traffic.",
          },
          {
            question: "Which service stores secrets and certificates securely?",
            options: ["Azure Monitor", "Key Vault", "Virtual Network", "Load Balancer"],
            correctIndex: 1,
            explanation: "Azure Key Vault protects secrets, encryption keys, and certificates.",
          },
        ],
      },
      {
        title: "Microsoft Azure Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Azure Crossword" },
          { type: "paragraph", content: "Review the services that form a secure Azure environment." },
          {
            type: "crossword",
            pairs: [
              { term: "VIRTUALMACHINE", definition: "Azure compute resource that runs Windows or Linux" },
              { term: "STORAGE", definition: "Azure account type used for blobs, files, queues, and tables" },
              { term: "VNET", definition: "Azure private-network boundary" },
              { term: "MONITOR", definition: "Azure observability service for metrics, logs, and alerts" },
              { term: "IDENTITY", definition: "The security concept managed through Microsoft Entra ID" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Secure an Azure Web Tier",
        description: "Design a resource group containing a VNet, public and private subnets, an NSG, a Linux VM, a storage account, Key Vault, and Azure Monitor. Explain how identity and network controls protect the workload.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "Git and GitHub",
    slug: "version-control",
    description: "Use Git, GitHub, branches, pull requests, and collaborative review workflows with confidence.",
    color: "#6E5494",
    icon: "git-branch",
    order: 4,
    lessons: [
      {
        title: "Git Fundamentals",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Track Every Change" },
          { type: "paragraph", content: "Git records snapshots of a project. A clear commit history makes infrastructure code safer to review, roll back, and collaborate on." },
          { type: "code", content: "git clone <repository>\ngit switch -c feature/networking\ngit status\ngit add main.tf\ngit commit -m \"Add VPC networking\"\ngit push -u origin feature/networking" },
          { type: "list", content: "Working tree — files currently being edited\nStaging area — changes selected for the next commit\nCommit — a named snapshot with history\nBranch — an independent line of work\nRemote — a shared repository such as GitHub" },
        ],
      },
      {
        title: "Branches and Pull Requests",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Collaborate Without Breaking Main" },
          { type: "paragraph", content: "Feature branches isolate changes. Pull requests provide automated checks, discussion, review, and a controlled merge into the shared branch." },
        ],
        questions: [
          {
            question: "What is the main purpose of a pull request?",
            options: ["Delete repository history", "Review and merge proposed changes", "Store cloud secrets", "Run a virtual machine"],
            correctIndex: 1,
            explanation: "Pull requests create a reviewable proposal before changes enter a shared branch.",
          },
          {
            question: "Which command creates and switches to a new branch?",
            options: ["git switch -c", "git status", "git log", "git diff --stat"],
            correctIndex: 0,
            explanation: "git switch -c <name> creates a branch and checks it out.",
          },
        ],
      },
      {
        title: "Git and GitHub Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Version Control Crossword" },
          { type: "paragraph", content: "Review the vocabulary used in collaborative Git workflows." },
          {
            type: "crossword",
            pairs: [
              { term: "COMMIT", definition: "A recorded snapshot of staged changes" },
              { term: "BRANCH", definition: "An independent line of development" },
              { term: "MERGE", definition: "Combining changes from different branches" },
              { term: "PULLREQUEST", definition: "A reviewable proposal to merge changes" },
              { term: "REPOSITORY", definition: "A project and its complete version history" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: GitHub Pull Request Workflow",
        description: "Create a repository, make a feature branch, add a small infrastructure file, commit with a clear message, open a pull request, complete a review checklist, and merge it.",
        dueInDays: 7,
      },
    ],
  },
  {
    name: "Docker Containerization",
    slug: "docker",
    description: "Package applications with Docker images, containers, registries, networks, volumes, and Compose.",
    color: "#2496ED",
    icon: "container",
    order: 5,
    lessons: [
      {
        title: "Images, Containers, and Dockerfiles",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Package Once, Run Consistently" },
          { type: "paragraph", content: "A Docker image is an immutable application package. A container is a running instance of that image with isolated processes, networking, and a writable layer." },
          { type: "code", content: "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD [\"npm\", \"start\"]" },
          { type: "list", content: "Use small trusted base images\nPin dependencies for repeatable builds\nRun as a non-root user\nKeep secrets out of image layers\nUse multi-stage builds to reduce final image size" },
        ],
      },
      {
        title: "Docker Compose and Persistent Data",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Run Multi-Container Applications" },
          { type: "paragraph", content: "Docker Compose defines services, networks, volumes, environment variables, and dependencies in one YAML file." },
        ],
        questions: [
          {
            question: "What is a Docker image?",
            options: ["A running process only", "An immutable template used to create containers", "A cloud subnet", "A monitoring alert"],
            correctIndex: 1,
            explanation: "Images contain the packaged filesystem and metadata used to start containers.",
          },
          {
            question: "What should store database files that must survive container replacement?",
            options: ["A named volume", "The container writable layer only", "The Dockerfile", "An exposed port"],
            correctIndex: 0,
            explanation: "Volumes persist data independently from a container's lifecycle.",
          },
        ],
      },
      {
        title: "Docker Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Docker Crossword" },
          { type: "paragraph", content: "Review the core objects in a container workflow." },
          {
            type: "crossword",
            pairs: [
              { term: "IMAGE", definition: "An immutable package used to start containers" },
              { term: "CONTAINER", definition: "A running isolated instance of an image" },
              { term: "DOCKERFILE", definition: "The file containing instructions to build an image" },
              { term: "COMPOSE", definition: "Docker tool for defining multi-service applications" },
              { term: "REGISTRY", definition: "A service that stores and distributes container images" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Containerize a Web Application",
        description: "Write a production-minded Dockerfile and Compose file for a web application. Include a health check, persistent volume, environment configuration, and a README with build and run commands.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "Kubernetes",
    slug: "kubernetes",
    description: "Run and scale containerized applications with Kubernetes workloads, services, configuration, secrets, and storage.",
    color: "#326CE5",
    icon: "boxes",
    order: 6,
    lessons: [
      {
        title: "Kubernetes Workloads and Services",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Orchestrate Containers at Scale" },
          { type: "paragraph", content: "Kubernetes continuously works toward a declared desired state. Deployments manage replicated Pods, while Services give workloads stable network access." },
          { type: "list", content: "Pod — the smallest deployable unit\nDeployment — manages rollout and replica state\nService — stable networking for a group of Pods\nNamespace — logical resource boundary\nLabel and selector — connect related objects\nIngress — routes external HTTP traffic" },
        ],
      },
      {
        title: "Configuration, Secrets, and Storage",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Keep Workloads Configurable" },
          { type: "paragraph", content: "ConfigMaps hold non-sensitive configuration, Secrets hold sensitive values, and PersistentVolumeClaims request durable storage." },
        ],
        questions: [
          {
            question: "Which Kubernetes object manages replicated Pods and rolling updates?",
            options: ["Deployment", "ConfigMap", "Secret", "Namespace"],
            correctIndex: 0,
            explanation: "Deployments manage ReplicaSets, desired replica count, and rolling updates.",
          },
          {
            question: "Which object gives a group of Pods a stable network endpoint?",
            options: ["Service", "Container image", "Node label", "PersistentVolume"],
            correctIndex: 0,
            explanation: "A Service selects Pods and provides stable discovery and load balancing.",
          },
        ],
      },
      {
        title: "Kubernetes Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Kubernetes Crossword" },
          { type: "paragraph", content: "Review the objects used to deploy and operate Kubernetes applications." },
          {
            type: "crossword",
            pairs: [
              { term: "POD", definition: "The smallest deployable Kubernetes unit" },
              { term: "DEPLOYMENT", definition: "A controller for replicas and rolling updates" },
              { term: "SERVICE", definition: "A stable network endpoint for selected Pods" },
              { term: "CONFIGMAP", definition: "An object for non-sensitive application configuration" },
              { term: "VOLUME", definition: "Storage mounted into a Pod" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Deploy and Scale on Kubernetes",
        description: "Create manifests for a Deployment, Service, ConfigMap, Secret, and PersistentVolumeClaim. Scale the application, perform a rolling update, and document your verification commands.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "Terraform Infrastructure as Code",
    slug: "terraform",
    description: "Provision repeatable cloud infrastructure with Terraform providers, resources, variables, modules, plans, and state.",
    color: "#7B42BC",
    icon: "layers",
    order: 7,
    lessons: [
      {
        title: "Terraform Workflow and State",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Describe Infrastructure as Code" },
          { type: "paragraph", content: "Terraform compares declarative configuration with recorded state, creates an execution plan, and calls provider APIs to converge infrastructure." },
          { type: "code", content: "terraform init\nterraform fmt -check\nterraform validate\nterraform plan -out=tfplan\nterraform apply tfplan" },
          { type: "list", content: "Providers connect Terraform to platform APIs\nResources declare infrastructure objects\nVariables make configuration reusable\nOutputs expose useful values\nState maps configuration to real resources\nModules package reusable architecture" },
        ],
      },
      {
        title: "Variables, Modules, and Safe Changes",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Build Reusable Infrastructure" },
          { type: "paragraph", content: "Modules reduce repetition. Remote state, locking, code review, and saved plans help teams make infrastructure changes safely." },
        ],
        questions: [
          {
            question: "What does terraform plan do?",
            options: ["Shows proposed changes", "Deletes state", "Creates a Git branch", "Builds a Docker image"],
            correctIndex: 0,
            explanation: "terraform plan previews the actions Terraform would take.",
          },
          {
            question: "Why should teams use remote state with locking?",
            options: ["To increase image size", "To coordinate changes and prevent concurrent state writes", "To replace Git", "To expose secrets publicly"],
            correctIndex: 1,
            explanation: "Remote state and locking help teams share state safely and avoid simultaneous modifications.",
          },
        ],
      },
      {
        title: "Terraform Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Terraform Crossword" },
          { type: "paragraph", content: "Review the pieces of a safe infrastructure-as-code workflow." },
          {
            type: "crossword",
            pairs: [
              { term: "PROVIDER", definition: "A plugin that communicates with a platform API" },
              { term: "RESOURCE", definition: "A managed infrastructure object in configuration" },
              { term: "VARIABLE", definition: "An input that makes configuration reusable" },
              { term: "MODULE", definition: "A reusable group of Terraform configuration files" },
              { term: "STATE", definition: "Terraform's record mapping configuration to real infrastructure" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Provision AWS Networking with Terraform",
        description: "Build a reusable Terraform module that creates a VPC, two public subnets, two private subnets, route tables, and security groups. Include variables, outputs, formatting, validation, and a reviewed plan.",
        dueInDays: 21,
      },
    ],
  },
  {
    name: "Ansible Automation",
    slug: "ansible",
    description: "Automate repeatable server configuration with inventories, playbooks, modules, roles, variables, and handlers.",
    color: "#EE0000",
    icon: "wrench",
    order: 8,
    lessons: [
      {
        title: "Inventories and Playbooks",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Configure Systems Consistently" },
          { type: "paragraph", content: "Ansible connects to managed hosts, evaluates YAML tasks, and uses modules to enforce desired configuration without installing an agent." },
          { type: "code", content: "- name: Configure web servers\n  hosts: web\n  become: true\n  tasks:\n    - name: Install nginx\n      ansible.builtin.package:\n        name: nginx\n        state: present\n    - name: Start nginx\n      ansible.builtin.service:\n        name: nginx\n        state: started\n        enabled: true" },
        ],
      },
      {
        title: "Idempotent Configuration",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Safe Repeatable Automation" },
          { type: "paragraph", content: "An idempotent playbook can run repeatedly without making unnecessary changes after the desired state is reached." },
        ],
        questions: [
          {
            question: "What does an Ansible inventory define?",
            options: ["Managed hosts and groups", "Docker image layers", "Cloud billing", "Git commit messages"],
            correctIndex: 0,
            explanation: "Inventories identify the systems Ansible manages and organize them into groups.",
          },
          {
            question: "What does idempotent mean?",
            options: ["Runs only on Windows", "Produces the same desired state when repeated", "Always changes every file", "Requires an agent"],
            correctIndex: 1,
            explanation: "Idempotent automation makes only the changes needed to reach the declared state.",
          },
        ],
      },
      {
        title: "Ansible Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Ansible Crossword" },
          { type: "paragraph", content: "Review Ansible's configuration-management vocabulary." },
          {
            type: "crossword",
            pairs: [
              { term: "PLAYBOOK", definition: "A YAML file describing automation plays and tasks" },
              { term: "INVENTORY", definition: "The managed hosts and groups targeted by Ansible" },
              { term: "MODULE", definition: "A reusable unit that performs a specific automation action" },
              { term: "TASK", definition: "One named action inside a play" },
              { term: "IDEMPOTENT", definition: "Safe to repeat without unnecessary changes" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Configure Linux Web Servers with Ansible",
        description: "Write an inventory and playbook that installs Nginx, deploys a custom page, configures a firewall rule, starts the service, and uses a handler to restart only when configuration changes.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "CI/CD Pipelines",
    slug: "cicd",
    description: "Build reliable continuous integration and delivery pipelines with Jenkins, GitHub Actions, testing, artifacts, approvals, and deployment automation.",
    color: "#D24939",
    icon: "workflow",
    order: 9,
    lessons: [
      {
        title: "Continuous Integration and Delivery",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Automate the Path to Production" },
          { type: "paragraph", content: "Continuous integration validates every change. Continuous delivery packages tested software so a reviewed release can be deployed consistently." },
          { type: "list", content: "Trigger — push, pull request, schedule, or manual event\nBuild — compile or package the application\nTest — unit, integration, security, and policy checks\nArtifact — versioned output from a successful pipeline\nDeploy — promote the same artifact through environments\nApproval — human control before sensitive production changes" },
        ],
      },
      {
        title: "Jenkins and GitHub Actions",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Pipeline as Code" },
          { type: "paragraph", content: "Jenkinsfiles and GitHub Actions workflows store pipeline behavior beside application and infrastructure code so changes can be reviewed." },
        ],
        questions: [
          {
            question: "Why should a deployment reuse the tested build artifact?",
            options: ["To avoid rebuilding different code for each environment", "To skip all testing", "To remove version history", "To expose secrets"],
            correctIndex: 0,
            explanation: "Promoting the same artifact reduces drift between what was tested and what is deployed.",
          },
          {
            question: "Where are GitHub Actions workflows normally stored?",
            options: [".github/workflows", "/var/log", ".terraform", "node_modules"],
            correctIndex: 0,
            explanation: "Workflow YAML files live in the repository's .github/workflows directory.",
          },
        ],
      },
      {
        title: "CI/CD Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "CI/CD Crossword" },
          { type: "paragraph", content: "Review the components that move a change safely toward production." },
          {
            type: "crossword",
            pairs: [
              { term: "PIPELINE", definition: "An automated sequence of build, test, and deployment stages" },
              { term: "JENKINS", definition: "An automation server commonly used for CI/CD" },
              { term: "WORKFLOW", definition: "A GitHub Actions automation definition" },
              { term: "ARTIFACT", definition: "A versioned output produced by a successful build" },
              { term: "RUNNER", definition: "The machine that executes a GitHub Actions job" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Build a CI/CD Pipeline",
        description: "Create a Jenkinsfile or GitHub Actions workflow that installs dependencies, runs lint and tests, builds an artifact, scans it, and deploys to a non-production environment after successful checks.",
        dueInDays: 14,
      },
    ],
  },
  {
    name: "Monitoring with Prometheus and Grafana",
    slug: "monitoring",
    description: "Observe production systems with metrics, dashboards, service-level indicators, and actionable alerts.",
    color: "#E6522C",
    icon: "gauge",
    order: 10,
    lessons: [
      {
        title: "Metrics, Dashboards, and Alerts",
        type: "content",
        order: 1,
        blocks: [
          { type: "heading", content: "Know What Production Is Doing" },
          { type: "paragraph", content: "Monitoring turns system measurements into operational awareness. Useful dashboards answer questions, while alerts notify engineers about actionable symptoms." },
          { type: "list", content: "Latency — how long requests take\nTraffic — how much demand the service receives\nErrors — the rate of failed operations\nSaturation — how close resources are to capacity\nSLI — a measured indicator of service behavior\nSLO — a reliability target for an SLI" },
        ],
      },
      {
        title: "Prometheus and Grafana",
        type: "quiz",
        order: 2,
        blocks: [
          { type: "heading", content: "Collect, Query, and Visualize" },
          { type: "paragraph", content: "Prometheus scrapes labeled time-series metrics and evaluates PromQL. Grafana queries data sources to build dashboards. Alert rules should be tested and linked to runbooks." },
        ],
        questions: [
          {
            question: "What does Prometheus primarily store?",
            options: ["Time-series metrics", "Container images", "Git branches", "Virtual networks"],
            correctIndex: 0,
            explanation: "Prometheus stores numeric time-series data identified by metric names and labels.",
          },
          {
            question: "What is Grafana primarily used for?",
            options: ["Visualizing and exploring operational data", "Building Docker images", "Managing IAM users", "Compiling Linux kernels"],
            correctIndex: 0,
            explanation: "Grafana builds dashboards and visualizations from metrics, logs, and other data sources.",
          },
        ],
      },
      {
        title: "Monitoring Crossword Challenge",
        type: "mandatory",
        order: 3,
        blocks: [
          { type: "heading", content: "Monitoring Crossword" },
          { type: "paragraph", content: "Review the terms used to measure and communicate service health." },
          {
            type: "crossword",
            pairs: [
              { term: "METRIC", definition: "A numeric measurement collected over time" },
              { term: "PROMETHEUS", definition: "A time-series monitoring and alerting system" },
              { term: "GRAFANA", definition: "A platform for dashboards and data visualization" },
              { term: "ALERT", definition: "A notification triggered when a meaningful condition is met" },
              { term: "DASHBOARD", definition: "A visual collection of operational signals" },
            ],
          },
        ],
      },
    ],
    homework: [
      {
        title: "Homework: Build a Service Health Dashboard",
        description: "Create a Grafana dashboard backed by Prometheus that shows latency, traffic, errors, and saturation. Add one actionable alert and write a short runbook for responding to it.",
        dueInDays: 14,
      },
    ],
  },
];

function lessonContent(blocks: LessonBlock[]): string {
  return JSON.stringify({ blocks });
}

async function upsertLesson(
  ctx: MutationCtx,
  trackId: Id<"tracks">,
  lesson: CurriculumLesson,
): Promise<{ lessonId: Id<"lessons">; changes: number }> {
  const lessons = await ctx.db
    .query("lessons")
    .withIndex("by_track", (q) => q.eq("trackId", trackId))
    .collect();
  const existing = lessons.find((item) => item.title === lesson.title);
  const content = lessonContent(lesson.blocks);
  let lessonId: Id<"lessons">;
  let changes = 0;

  if (!existing) {
    lessonId = await ctx.db.insert("lessons", {
      trackId,
      title: lesson.title,
      content,
      type: lesson.type,
      order: lesson.order,
      published: true,
    });
    changes += 1;
  } else {
    lessonId = existing._id;
    if (
      existing.content !== content ||
      existing.type !== lesson.type ||
      existing.order !== lesson.order ||
      !existing.published
    ) {
      await ctx.db.patch(existing._id, {
        content,
        type: lesson.type,
        order: lesson.order,
        published: true,
      });
      changes += 1;
    }
  }

  const existingQuestions = await ctx.db
    .query("quizQuestions")
    .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
    .collect();
  for (const [order, question] of (lesson.questions ?? []).entries()) {
    const existingQuestion = existingQuestions.find(
      (item) => item.question === question.question,
    );
    const questionOrder = order + 1;
    if (!existingQuestion) {
      await ctx.db.insert("quizQuestions", {
        lessonId,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        order: questionOrder,
      });
      changes += 1;
    } else if (
      existingQuestion.correctIndex !== question.correctIndex ||
      existingQuestion.explanation !== question.explanation ||
      existingQuestion.order !== questionOrder ||
      JSON.stringify(existingQuestion.options) !== JSON.stringify(question.options)
    ) {
      await ctx.db.patch(existingQuestion._id, {
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        order: questionOrder,
      });
      changes += 1;
    }
  }

  return { lessonId, changes };
}

async function syncCurriculum(
  ctx: MutationCtx,
  teacherId: Id<"users">,
): Promise<{ tracks: number; lessons: number; assignments: number; htmlHidden: boolean }> {
  let trackChanges = 0;
  let lessonChanges = 0;
  let assignmentChanges = 0;
  let htmlHidden = false;

  const htmlTrack = await ctx.db
    .query("tracks")
    .withIndex("by_slug", (q) => q.eq("slug", "html"))
    .unique();
  if (htmlTrack?.published) {
    await ctx.db.patch(htmlTrack._id, { published: false });
    htmlHidden = true;
  }
  if (htmlTrack) {
    const htmlLessons = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", htmlTrack._id))
      .collect();
    for (const lesson of htmlLessons) {
      if (lesson.published) {
        await ctx.db.patch(lesson._id, { published: false });
        lessonChanges += 1;
      }
    }
  }

  for (const definition of DEVOPS_TRACKS) {
    let track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", definition.slug))
      .unique();

    if (!track) {
      const trackId = await ctx.db.insert("tracks", {
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        color: definition.color,
        icon: definition.icon,
        order: definition.order,
        published: true,
      });
      track = await ctx.db.get(trackId);
      trackChanges += 1;
    } else if (
      track.name !== definition.name ||
      track.description !== definition.description ||
      track.color !== definition.color ||
      track.icon !== definition.icon ||
      track.order !== definition.order ||
      !track.published
    ) {
      await ctx.db.patch(track._id, {
        name: definition.name,
        description: definition.description,
        color: definition.color,
        icon: definition.icon,
        order: definition.order,
        published: true,
      });
      track = await ctx.db.get(track._id);
      trackChanges += 1;
    }

    if (!track) throw new Error(`Could not create curriculum track: ${definition.name}`);

    for (const lesson of definition.lessons) {
      const result = await upsertLesson(ctx, track._id, lesson);
      lessonChanges += result.changes;
    }

    for (const homework of definition.homework) {
      const existingAssignment = await ctx.db
        .query("assignments")
        .withIndex("by_title", (q) => q.eq("title", homework.title))
        .unique();

      if (!existingAssignment) {
        await ctx.db.insert("assignments", {
          title: homework.title,
          description: homework.description,
          trackId: track._id,
          dueDate: Date.now() + homework.dueInDays * 24 * 60 * 60 * 1000,
          createdBy: teacherId,
          assignedToAll: true,
        });
        assignmentChanges += 1;
      } else if (
        existingAssignment.description !== homework.description ||
        existingAssignment.trackId !== track._id ||
        !existingAssignment.assignedToAll
      ) {
        await ctx.db.patch(existingAssignment._id, {
          description: homework.description,
          trackId: track._id,
          assignedToAll: true,
        });
        assignmentChanges += 1;
      }
    }
  }

  const supplementaryOrders: Record<string, number> = {
    hardware: 11,
    ai: 12,
    cybersecurity: 13,
  };
  for (const [slug, order] of Object.entries(supplementaryOrders)) {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (track && track.order !== order) {
      await ctx.db.patch(track._id, { order });
      trackChanges += 1;
    }
  }

  return {
    tracks: trackChanges,
    lessons: lessonChanges,
    assignments: assignmentChanges,
    htmlHidden,
  };
}

export const syncDevOpsCurriculum = mutation({
  args: {},
  returns: v.object({
    tracks: v.number(),
    lessons: v.number(),
    assignments: v.number(),
    htmlHidden: v.boolean(),
    ragRefreshScheduled: v.boolean(),
  }),
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const result = await syncCurriculum(ctx, teacher._id);
    const changed =
      result.tracks > 0 ||
      result.lessons > 0 ||
      result.assignments > 0 ||
      result.htmlHidden;

    if (changed) {
      await ctx.scheduler.runAfter(0, internal.embeddings.rebuildAll, {});
    }

    return { ...result, ragRefreshScheduled: changed };
  },
});
