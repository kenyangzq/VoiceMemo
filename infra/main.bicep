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

@description('GitHub repository URL (e.g. https://github.com/user/VoiceMemo)')
param repositoryUrl string = ''

@description('GitHub branch for deployment')
param repositoryBranch string = 'main'

@secure()
@description('Google Gemini API key for title generation')
param geminiApiKey string = ''

@secure()
@description('Google Client ID for Drive OAuth')
param googleClientId string = ''

@secure()
@description('Google Client Secret for Drive OAuth')
param googleClientSecret string = ''

@description('Frontend URL for OAuth redirect')
param frontendUrl string = ''

resource speechService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: '${staticWebAppName}-speech'
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'SpeechServices'
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

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
    AZURE_SPEECH_KEY: speechService.listKeys().key1
    AZURE_SPEECH_REGION: location
    GEMINI_API_KEY: geminiApiKey
    GOOGLE_CLIENT_ID: googleClientId
    GOOGLE_CLIENT_SECRET: googleClientSecret
    GOOGLE_REDIRECT_URI: frontendUrl != '' ? '${frontendUrl}/api/google-drive/callback' : ''
    FRONTEND_URL: frontendUrl
  }
}

@description('Default hostname of the Static Web App')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Static Web App resource ID')
output staticWebAppId string = staticWebApp.id
