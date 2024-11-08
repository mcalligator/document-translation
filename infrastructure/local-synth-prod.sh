#! /bin/bash
export webUiCustomDomain="ctxtranslate.cloud"
export webUiCustomDomainCertificate="arn:aws:acm:us-east-1:471112910241:certificate/66beef01-39ad-421a-8ed4-36798cbe6acd"

export translation="true"
export translationPii="false"
export translationLifecycleDefault="1"

export sourceGitService="GitHub"
export sourceGitRepo="github.com/citytrax/document-translation-saas"
export sourceGitBranch="mt-prod"
export sourceConnectionArn="arn:aws:codeconnections:eu-west-2:471112910241:connection/e60d0575-23b1-4533-9629-053b483a7e2c"

export cognitoLocalUsers="true"
export cognitoLocalUsersMfa="off"   # Change to "on" at the appropriate time

export webUi="true"

export readable="false"

export development="true"
export appRemovalPolicy="destroy"
export pipelineRemovalPolicy="destroy"

echo "Synth and diff of DocTran-${sourceGitBranch}"
git switch ${sourceGitBranch}
# Synthesise CDK TS to CloudFormation
cdk synth "DocTran-${sourceGitBranch}-pipeline/DocTran-appStack/DocTran-${sourceGitBranch}-app" -a 'npx ts-node ./bin/doctran.ts'
# Show a diff of changes
# cdk diff "DocTran-${sourceGitBranch}-pipeline/DocTran-appStack/DocTran-${sourceGitBranch}-app" -a 'npx ts-node ./bin/doctran.ts'