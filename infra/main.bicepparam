using './main.bicep'

param staticWebAppName = 'voicememo'
param location = 'eastus2'
param sku = 'Free'
param openAiApiKey = readEnvironmentVariable('OPENAI_API_KEY', '')
param repositoryUrl = ''
param repositoryBranch = 'main'
