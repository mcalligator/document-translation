#! /bin/bash

export translation="true"
export translationPii="false"
export translationLifecycleDefault="1"

export sourceGitService="GitHub"
export sourceGitRepo="mcalligator/document-translation"
export sourceGitBranch="mt-test"
export sourceConnectionArn="arn:aws:codestar-connections:eu-west-2:471112910241:connection/bb887e4a-d333-4f8b-b101-c5a47f991245"

export cognitoLocalUsers="true"
export cognitoLocalUsersMfa="off"

export webUi="true"

export readable="false"

export development="true"
export appRemovalPolicy="destroy"
export pipelineRemovalPolicy="destroy"

echo "Synth and diff of DocTran-${sourceGitBranch}"
# Synthesise CDK TS to CloudFormation
cdk synth "DocTran-${sourceGitBranch}-pipeline/DocTran-appStack/DocTran-${sourceGitBranch}-app" -a 'npx ts-node ./bin/doctran.ts'
# Show a diff of changes
# cdk diff "DocTran-${sourceGitBranch}-pipeline/DocTran-appStack/DocTran-${sourceGitBranch}-app" -a 'npx ts-node ./bin/doctran.ts'