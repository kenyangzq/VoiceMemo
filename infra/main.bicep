targetScope = 'resourceGroup'

@description('Name of the Static Web App')
param staticWebAppName string = 'voicememo'

@description('Location for the Static Web App')
@allowed([
  'centralus'
  'eastus2'
  'eastasia'
  'westeurope'
  'westus2'
])
param location string = 'eastus2'

@description('SKU for the Static Web App')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('OpenAI API key for Whisper transcription')
@secure()
param openAiApiKey string

@description('GitHub repository URL (e.g. https://github.com/user/VoiceMemo)')
param repositoryUrl string = ''

@description('GitHub branch for deployment')
param repositoryBranch string = 'main'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: repositoryUrl != '' ? repositoryUrl : null
    branch: repositoryUrl != '' ? repositoryBranch : null
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    OPENAI_API_KEY: openAiApiKey
  }
}

@description('Default hostname of the Static Web App')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Static Web App resource ID')
output staticWebAppId string = staticWebApp.id

@description('Deployment token for GitHub Actions')
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
