# Clemson Rideshare

A modern rideshare application designed specifically for Clemson University students to coordinate long-distance commutes when traveling home for breaks. This platform allows students to share rides, split costs, and travel safely with fellow Tigers.

## 🚀 Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Infrastructure**: [SST v4 (Ion)](https://sst.dev/) - Serverless Stack on AWS
- **Database**: [AWS Aurora Serverless v2](https://aws.amazon.com/rds/aurora/serverless/) (PostgreSQL)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [AWS Cognito](https://aws.amazon.com/cognito/) (with Clemson email validation)
- **Payments**: [Stripe](https://stripe.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Location Services**: [Amazon Location Service](https://aws.amazon.com/location/) (Maps, Search, Routing)
- **Messaging/Events**: [AWS EventBridge](https://aws.amazon.com/eventbridge/)
- **Workflows**: [AWS Step Functions](https://aws.amazon.com/step-functions/)
- **Package Manager**: [Bun](https://bun.sh/)

## ✨ Features

- **Tigers Only**: Integration with AWS Cognito Pre-SignUp Lambda ensures only users with `@clemson.edu` email addresses can register.
- **Ride Management**: Drivers can post rides with origin, destination, departure time, and available seats.
- **Search & Filter**: Find rides based on location and date.
- **Secure Payments**: Integrated with Stripe for seat bookings and driver payouts.
- **Interactive Maps**: Route visualization and location search powered by Amazon Location Service.
- **Automated Workflows**: Step Functions manage the ride lifecycle from request to completion.
- **Real-time Notifications**: Event-driven notifications via AWS EventBridge.

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/docs/installation) installed locally.
- [AWS CLI](https://aws.amazon.com/cli/) configured with your credentials.
- [Stripe Account](https://stripe.com/) for API keys.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd clemson-rideshare
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up SST Secrets (Stripe):
   ```bash
   bun sst secret set StripeSecretKey <your-stripe-secret-key>
   bun sst secret set StripePublishableKey <your-stripe-publishable-key>
   bun sst secret set StripeWebhookSecret <your-stripe-webhook-secret>
   ```

### Development

Start the SST development environment:

```bash
bun sst dev
```

This will:
- Deploy your infrastructure to a temporary "stage" in AWS.
- Start the Next.js development server.
- Link local environment variables to your AWS resources.

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database Migrations

To push your local schema changes to the Aurora database:

```bash
bun x drizzle-kit push
```

## 🏗️ Architecture

- **`app/`**: Next.js App Router pages and API routes.
- **`components/`**: Reusable UI components (shadcn-inspired) and feature-specific components.
- **`functions/`**: AWS Lambda handlers for Cognito triggers, EventBridge events, and Step Function tasks.
- **`lib/`**: Shared logic for database, authentication, payments, and mapping.
- **`sst.config.ts`**: Infrastructure-as-code definition using SST Ion.

## 🚢 Deployment

To deploy the application to production:

```bash
bun sst deploy --stage production
```

## 📄 License

This project is licensed under the MIT License.
