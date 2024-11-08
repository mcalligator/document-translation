#! /bin/bash
export webUiCustomDomain="test.ctxtranslate.cloud"
export webUiCustomDomainCertificate="arn:aws:acm:us-east-1:156041422987:certificate/12ed3682-22d7-4836-8e24-1c6268d30305"

export translation="true"
export translationPii="false"
export translationLifecycleDefault="1"

export sourceGitService="GitHub"
export sourceGitRepo="github.com/citytrax/document-translation-saas"
export sourceGitBranch="mt-test"
export sourceConnectionArn="arn:aws:codeconnections:eu-west-2:156041422987:connection/0888d95e-8677-45cd-8b68-c31647fd4ac3"

export cognitoLocalUsers="true"
export cognitoLocalUsersMfa="off"

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