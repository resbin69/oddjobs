import React from 'react'
import ReactDOM from 'react-dom/client'
// Since both main.jsx and HyperlocalGigApp.jsx are in /src, 
// the relative path is just './'
import App from './app.jsx' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)