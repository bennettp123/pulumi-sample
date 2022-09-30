# pulumi-sample

Creates a sample web app in AWS using infrastructure as code.

## Quickstart

Prerequisites:

- [nodejs](https://nodejs.org/en/download/)
- [pulumi](https://www.pulumi.com/docs/get-started/install/)
- You'll also need some AWS credentials; see
  [docs.aws.amazon.com](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
  for details

Then:

```bash
# install dependencies
npm i

# create a new pulumi stack
pulumi stack init

# bring up the stack
pulumi up
```

## Teardown

To tear down the stack:


```bash
pulumi destroy
```

