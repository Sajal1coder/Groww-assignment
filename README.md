# FinBoard - Customizable Finance Dashboard

A modern, flexible dashboard built with Next.js that allows users to create and customize widgets for monitoring any type of data through REST APIs.

## 🚀 Features

### Core Functionality
- **Drag & Drop Interface**: Intuitive widget management with HTML5 drag and drop
- **Universal API Support**: Connect to any REST API endpoint
- **Flexible Widget Types**:
  - **Table View**: Display API data in sortable, searchable tables
  - **Card View**: Clean key-value pair display for detailed information
  - **Chart View**: Interactive charts with automatic numeric field detection
  - **Custom View**: Flexible rendering for any API response structure

### Advanced Features
- **Smart Field Detection**: Automatically identifies numeric fields for charts
- **Flexible Data Handling**: Works with nested objects, arrays, and complex JSON structures
- **State Management**: Zustand for efficient state handling
- **Data Persistence**: LocalStorage integration for dashboard layouts
- **Theme Support**: Light/Dark mode with system preference detection
- **Responsive Design**: Auto-wrapping widget layout that adapts to screen size
- **Error Handling**: Comprehensive error states and retry mechanisms
- **API Caching**: Smart caching with TTL support to reduce API calls
- **Export/Import**: Dashboard configuration backup and restore

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand with persistence
- **Charts**: Recharts for data visualization
- **Drag & Drop**: HTML5 native drag and drop API
- **API Integration**: Universal REST API support with caching
- **Icons**: Lucide React
- **Data Processing**: Automatic field detection and type inference

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finboard-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Getting Started
1. **Add Your First Widget**: Click "Add Widget" to create your first data widget
2. **Enter API URL**: Provide any REST API endpoint that returns JSON data
3. **Choose Display Type**: Select how you want to visualize the data
4. **Arrange Layout**: Drag and drop widgets to organize your dashboard

### Widget Display Types

#### Table View
- Display API data in a sortable, searchable table format
- Automatic pagination for large datasets
- Perfect for structured data with multiple records
- **Example APIs**:
  - `https://jsonplaceholder.typicode.com/users` - User directory
  - `https://api.github.com/users/octocat/repos` - GitHub repositories
  - `https://reqres.in/api/users` - Sample user data

#### Card View
- Clean key-value pair display for detailed information
- Ideal for single records or object data
- Automatically formats nested objects
- **Example APIs**:
  - `https://jsonplaceholder.typicode.com/users/1` - Single user profile
  - `https://api.github.com/users/octocat` - GitHub user profile
  - `https://httpbin.org/json` - Sample JSON object

#### Chart View
- Interactive line and candlestick charts
- Automatic detection of numeric fields for visualization
- Time-series support with date/timestamp recognition
- **Example APIs**:
  - `https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&apikey=demo` - Stock data
  - `https://api.coindesk.com/v1/bpi/historical/close.json` - Bitcoin prices
  - `https://api.exchangerate-api.com/v4/latest/USD` - Currency rates

#### Custom View
- Flexible rendering for any API response structure
- Handles complex nested data automatically
- Adapts to different JSON schemas
- **Example APIs**:
  - `https://api.openweathermap.org/data/2.5/weather?q=London&appid=demo` - Weather data
  - `https://dog.ceo/api/breeds/list/all` - Dog breeds list
  - `https://catfact.ninja/fact` - Random cat facts

### Dashboard Management
- **Auto Refresh**: Configure automatic data updates (15s to 5m intervals)
- **Export/Import**: Backup and restore dashboard configurations
- **Theme Toggle**: Switch between light and dark modes
- **Reset Option**: Clear all widgets and start fresh

## 🔧 Configuration

### Widget Configuration
Each widget can be customized with:
- **API URL**: Any REST endpoint that returns JSON data
- **Display Type**: Table, Card, Chart, or Custom view
- **Refresh Interval**: Auto-refresh from 15 seconds to 5 minutes
- **Caching**: TTL-based caching to reduce API calls
- **Visual Settings**: Custom titles and responsive layouts

### API Requirements
- **Format**: Must return valid JSON data
- **CORS**: API should support cross-origin requests or use a proxy
- **Rate Limits**: Built-in caching helps manage API quotas
- **Authentication**: Currently supports public APIs (auth headers can be added)

## 📱 Responsive Design

The dashboard features an intelligent auto-wrapping layout:
- **Desktop**: Widgets arrange in flexible rows, wrapping as needed
- **Tablet**: Touch-friendly interface with optimized widget sizing
- **Mobile**: Single-column layout with full-width widgets
- **Auto-sizing**: Widgets automatically adjust based on content

## 🌟 Example Use Cases

### Financial Monitoring
- Stock prices from Alpha Vantage or Twelve Data
- Cryptocurrency rates from CoinDesk
- Exchange rates from ExchangeRate-API

### Development Tracking
- GitHub repository stats and commits
- API monitoring and health checks
- Server metrics and performance data

### Content Management
- Blog post analytics
- Social media metrics
- E-commerce product data

### General Data Visualization
- Weather information
- News feeds and updates
- Any JSON API endpoint

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site deployment
- **AWS**: S3 + CloudFront for static hosting
- **Docker**: Containerized deployment for any platform

## 🔒 Security & Best Practices

- **CORS Handling**: Proper cross-origin request management
- **Rate Limiting**: Built-in caching prevents API quota exhaustion
- **Error Boundaries**: Graceful error handling and recovery
- **Data Validation**: Input sanitization and type checking
- **Performance**: Smart caching and efficient re-rendering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **JSONPlaceholder** for providing free testing APIs
- **Vercel** for hosting and deployment platform
- **Next.js Team** for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Recharts** for beautiful data visualization components

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Test with the provided example APIs to verify functionality

---

Built with ❤️ for the developer community
