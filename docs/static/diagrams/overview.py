# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
from dataclasses import replace
from diagrams                import Diagram, Cluster
from diagrams.aws.mobile     import Appsync
from diagrams.aws.storage    import S3
from diagrams.aws.database   import DDB
from diagrams.aws.security   import Cognito
from  diagrams.aws.general import Client
from diagrams.aws.network    import CloudFront
from diagrams.aws.security   import WAF, Macie
from diagrams.aws.integration   import SF
from diagrams.azure.identity import ActiveDirectory
from diagrams.aws.ml import Translate
from diagrams.aws.general import SDK

import attr

name = os.path.splitext(os.path.basename(__file__))[0]
name_human = name.replace("_", " ").capitalize()

with Diagram(name_human, filename=name, show=False, graph_attr=attr.graph):

    #
    # SHARED
    # SHARED | NODES
    with Cluster("Shared"):
        shared_client = Client("Client")
        with Cluster("Auth"):
            shared_auth    = Cognito("Cognito\n(User Auth)")
            shared_azuread = ActiveDirectory("Identity Provider\n(Azure AD/SAML 2.0)")
        with Cluster("API"):
            shared_api_waf     = WAF("WAF\n(Firewall)")
            shared_api_api     = Appsync("AppSync\n(GraphQL API)") 
        with Cluster("Web hosting"):
            shared_web_cache = CloudFront("CloudFront\n(Web Cache))")
            shared_web_hosting = S3("S3 Bucket\n(Static Web)")

    # SHARED | CONNECTIONS
    # SHARED | CONNECTIONS | WEB HOSTING
    shared_web_cache << shared_web_hosting
    shared_client << shared_web_cache
    # SHARED | CONNECTIONS | API
    shared_api_waf >> shared_api_api
    shared_client >> shared_api_waf
    # SHARED | CONNECTIONS | AUTH
    shared_client >> shared_auth >> shared_azuread

    #
    # HELP
    # HELP | NODES
    with Cluster("Help Info"):
        help_ddb = DDB("DynamoDB\n(Help Info)")

    # HELP | CONNECTIONS
    shared_api_api >> help_ddb

    #
    # TRANSLATION
    # TRANSLATION | NODES
    with Cluster("Document Translation"):
        dt_content = S3("S3 Bucket\n(User Documents)")
        dt_jobs = DDB("DynamoDB\n(Job History)")
        dt_sfn = SF("Step Functions\n(Workflows)")
        dt_translate = Translate("Translate\n(Translation)")
        dt_macie = Macie("Macie\n(PII Detection)")

    # TRANSLATION | CONNECTIONS
    shared_api_api >> dt_jobs >> dt_sfn
    shared_client >> dt_content << dt_sfn
    dt_sfn >> dt_macie
    dt_sfn >> dt_translate

    #
    # READABLE
    # READABLE | NODES
    with Cluster("Simply Readable"):
        sr_content = S3("S3 Bucket\n(Generated Images)")
        sr_jobs = DDB("DynamoDB\n(Job History)")
        sr_models = DDB("DynamoDB\n(Model Definitions)")
        sr_sfn = SF("Step Functions\n(Workflows)")
        sr_bedrock = SDK("Bedrock\n(Generative AI)")

    # READABLE | CONNECTIONS
    shared_api_api >> sr_jobs >> sr_sfn
    shared_api_api << sr_models >> sr_sfn
    shared_client >> sr_content << sr_sfn
    sr_sfn >> sr_bedrock