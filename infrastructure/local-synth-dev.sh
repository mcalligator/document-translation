#! /bin/bash
export webUiCustomDomain=""
export webUiCustomDomainCertificate=""

export translation="true"
export translationPii="false"
export translationLifecycleDefault="1"

export sourceGitService="GitHub"
export sourceGitRepo="github.com/citytrax/document-translation-saas"
export sourceGitBranch="mt-dev"
export sourceConnectionArn=""

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