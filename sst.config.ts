/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "clemson-rideshare",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    // ── Secrets ──
    const stripeSecretKey = new sst.Secret("StripeSecretKey");
    const stripeWebhookSecret = new sst.Secret("StripeWebhookSecret");
    const stripePublishableKey = new sst.Secret("StripePublishableKey");

    // ── Cognito Pre Sign-up Lambda ──
    const preSignupFn = new sst.aws.Function("CognitoPreSignup", {
      handler: "functions/cognito-pre-signup.handler",
      runtime: "nodejs22.x",
    });

    // ── Cognito User Pool ──
    const userPool = new aws.cognito.UserPool("ClemsonUserPool", {
      name: `clemson-rideshare-${$app.stage}`,
      autoVerifiedAttributes: ["email"],
      usernameAttributes: ["email"],
      schemas: [
        {
          name: "email",
          attributeDataType: "String",
          required: true,
          mutable: true,
        },
        {
          name: "name",
          attributeDataType: "String",
          required: true,
          mutable: true,
        },
      ],
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        requireUppercase: true,
      },
      lambdaConfig: {
        preSignUp: preSignupFn.arn,
      },
    });

    // Allow Cognito to invoke the pre-signup Lambda
    new aws.lambda.Permission("CognitoPreSignupPermission", {
      action: "lambda:InvokeFunction",
      function: preSignupFn.arn,
      principal: "cognito-idp.amazonaws.com",
      sourceArn: userPool.arn,
    });

    const userPoolClient = new aws.cognito.UserPoolClient(
      "ClemsonUserPoolClient",
      {
        userPoolId: userPool.id,
        name: `clemson-rideshare-client-${$app.stage}`,
        explicitAuthFlows: [
          "ALLOW_USER_PASSWORD_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
          "ALLOW_USER_SRP_AUTH",
        ],
        generateSecret: false,
      }
    );

    // ── Aurora Serverless v2 (PostgreSQL) ──
    const vpc = new sst.aws.Vpc("ClemsonVpc", {
      baseCidr: "10.0.0.0/16",
    });

    const database = new sst.aws.Aurora("ClemsonDB", {
      engine: "postgres",
      vpc,
      scaling: {
        min: "0 ACU",
        max: "4 ACU",
      },
      dataApi: true,
    });

    // ── Amazon Location Service ──
    // PlaceIndex is supported by Pulumi; RouteCalculator and Map are created
    // via AWS CLI or console since they aren't in this provider version.
    const placeIndex = new aws.location.PlaceIndex("ClemsonPlaceIndex", {
      indexName: `clemson-rideshare-places-${$app.stage}`,
      dataSource: "Here",
    });

    const routeCalculatorName = `clemson-rideshare-routes-${$app.stage}`;
    const locationMapName = `clemson-rideshare-map-${$app.stage}`;

    // ── EventBridge ──
    const eventBus = new sst.aws.Bus("ClemsonEventBus");

    // ── Step Functions ── Ride Request Workflow
    const rideWorkflowFn = new sst.aws.Function("RideWorkflow", {
      handler: "functions/ride-workflow.handler",
      runtime: "nodejs22.x",
      link: [database, stripeSecretKey],
      timeout: "30 seconds",
    });

    // ── EventBridge Scheduler Handler ──
    const rideSchedulerFn = new sst.aws.Function("RideScheduler", {
      handler: "functions/ride-scheduler.handler",
      runtime: "nodejs22.x",
      link: [database],
      timeout: "30 seconds",
    });

    // ── Event Bus Subscriptions ──
    eventBus.subscribe(
      "RideEventHandler",
      {
        handler: "functions/ride-events.handler",
        runtime: "nodejs22.x",
        link: [database],
        timeout: "30 seconds",
      },
      {
        pattern: {
          source: ["clemson-rideshare"],
        },
      }
    );

    // ── CloudWatch Dashboard ──
    new aws.cloudwatch.Dashboard("ClemsonDashboard", {
      dashboardName: `clemson-rideshare-${$app.stage}`,
      dashboardBody: $jsonStringify({
        widgets: [
          {
            type: "metric",
            x: 0,
            y: 0,
            width: 12,
            height: 6,
            properties: {
              title: "Lambda Invocations",
              metrics: [
                [
                  "AWS/Lambda",
                  "Invocations",
                  "FunctionName",
                  preSignupFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Invocations",
                  "FunctionName",
                  rideWorkflowFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Invocations",
                  "FunctionName",
                  rideSchedulerFn.name,
                ],
              ],
              period: 300,
              stat: "Sum",
              region: "us-east-1",
            },
          },
          {
            type: "metric",
            x: 12,
            y: 0,
            width: 12,
            height: 6,
            properties: {
              title: "Lambda Errors",
              metrics: [
                [
                  "AWS/Lambda",
                  "Errors",
                  "FunctionName",
                  preSignupFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Errors",
                  "FunctionName",
                  rideWorkflowFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Errors",
                  "FunctionName",
                  rideSchedulerFn.name,
                ],
              ],
              period: 300,
              stat: "Sum",
              region: "us-east-1",
            },
          },
          {
            type: "metric",
            x: 0,
            y: 6,
            width: 12,
            height: 6,
            properties: {
              title: "Lambda Duration (p95)",
              metrics: [
                [
                  "AWS/Lambda",
                  "Duration",
                  "FunctionName",
                  preSignupFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Duration",
                  "FunctionName",
                  rideWorkflowFn.name,
                ],
                [
                  "AWS/Lambda",
                  "Duration",
                  "FunctionName",
                  rideSchedulerFn.name,
                ],
              ],
              period: 300,
              stat: "p95",
              region: "us-east-1",
            },
          },
          {
            type: "metric",
            x: 12,
            y: 6,
            width: 12,
            height: 6,
            properties: {
              title: "Aurora Serverless ACU Utilization",
              metrics: [
                [
                  "AWS/RDS",
                  "ServerlessDatabaseCapacity",
                  "DBClusterIdentifier",
                  database.clusterIdentifier,
                ],
                [
                  "AWS/RDS",
                  "ACUUtilization",
                  "DBClusterIdentifier",
                  database.clusterIdentifier,
                ],
              ],
              period: 300,
              stat: "Average",
              region: "us-east-1",
            },
          },
          {
            type: "metric",
            x: 0,
            y: 12,
            width: 12,
            height: 6,
            properties: {
              title: "Aurora Database Connections",
              metrics: [
                [
                  "AWS/RDS",
                  "DatabaseConnections",
                  "DBClusterIdentifier",
                  database.clusterIdentifier,
                ],
              ],
              period: 300,
              stat: "Average",
              region: "us-east-1",
            },
          },
        ],
      }),
    });

    // ── CloudWatch Alarms ──
    new aws.cloudwatch.MetricAlarm("LambdaErrorAlarm", {
      alarmName: `clemson-rideshare-lambda-errors-${$app.stage}`,
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "Errors",
      namespace: "AWS/Lambda",
      period: 300,
      statistic: "Sum",
      threshold: 0,
      alarmDescription: "Alert when any Lambda function has errors",
      dimensions: {
        FunctionName: rideWorkflowFn.name,
      },
    });

    // ── Next.js Site ──
    const site = new sst.aws.Nextjs("ClemsonSite", {
      link: [
        database,
        stripeSecretKey,
        stripeWebhookSecret,
        stripePublishableKey,
      ],
      permissions: [
        {
          actions: [
            "geo:SearchPlaceIndexForSuggestions",
            "geo:SearchPlaceIndexForText",
            "geo:GetPlace",
            "geo:CalculateRoute",
            "geo:GetMap*",
          ],
          resources: ["*"],
        },
        {
          actions: [
            "events:PutEvents",
          ],
          resources: ["*"],
        },
      ],
      environment: {
        COGNITO_USER_POOL_ID: userPool.id,
        COGNITO_CLIENT_ID: userPoolClient.id,
        LOCATION_PLACE_INDEX: placeIndex.indexName,
        LOCATION_ROUTE_CALCULATOR: routeCalculatorName,
        LOCATION_MAP_NAME: locationMapName,
        EVENT_BUS_NAME: eventBus.name,
        DATABASE_ARN: database.clusterArn,
        DATABASE_SECRET_ARN: database.secretArn,
        DATABASE_NAME: "clemson_rideshare",
      },
    });

    return {
      siteUrl: site.url,
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
    };
  },
});
