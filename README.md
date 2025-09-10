# FinBoard - Customizable Finance Dashboard

A modern, real-time finance dashboard built with Next.js that allows users to create and customize widgets for monitoring financial data.

## 🚀 Features

### Core Functionality
- **Drag & Drop Interface**: Intuitive widget management with react-beautiful-dnd
- **Real-time Data**: Live financial data from Alpha Vantage API
- **Multiple Widget Types**:
  - Stock Table: Paginated table with search and sorting
  - Stock Card: Detailed single stock view
  - Price Chart: Interactive line charts with multiple intervals
  - Watchlist: Personal favorite stocks tracker
  - Market Movers: Top gainers, losers, and most active stocks
  - Performance: Compare multiple stocks performance

### Advanced Features
- **State Management**: Zustand for efficient state handling
- **Data Persistence**: LocalStorage integration for dashboard layouts
- **Theme Support**: Light/Dark mode with system preference detection
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Error Handling**: Comprehensive error states and retry mechanisms
- **Rate Limiting**: Smart API call management and caching
- **Export/Import**: Dashboard configuration backup and restore

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand with persistence
- **Charts**: Recharts for data visualization
- **Drag & Drop**: react-beautiful-dnd
- **API**: Alpha Vantage for financial data
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

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

3. **Set up environment variables**
   - Copy `.env.local` and add your Alpha Vantage API key
   - Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   ```env
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Getting Started
1. **Add Your First Widget**: Click "Add Widget" to create your first financial widget
2. **Choose Widget Type**: Select from 6 different widget types based on your needs
3. **Configure Settings**: Set stock symbols, refresh intervals, and display options
4. **Arrange Layout**: Drag and drop widgets to organize your dashboard

### Widget Types

#### Stock Table
- Display multiple stocks in a sortable, searchable table
- Pagination support for large datasets
- Real-time price updates with change indicators

#### Stock Card
- Detailed view of individual stock metrics
- Day range, volume, and price change information
- Clean, card-based design for easy scanning

#### Price Chart
- Interactive line charts with multiple time intervals
- Support for intraday (5m, 15m, 30m, 1h) and daily data
- Hover tooltips with detailed price information

#### Watchlist
- Personal collection of favorite stocks
- Quick performance overview with trend indicators
- Easy add/remove functionality

#### Market Movers
- Top gainers, losers, and most active stocks
- Tabbed interface for easy navigation
- Real-time market sentiment indicators

#### Performance Comparison
- Side-by-side performance comparison
- Bar chart visualization of percentage changes
- Ranked list with performance metrics

### Dashboard Management
- **Auto Refresh**: Configure automatic data updates (15s to 5m intervals)
- **Export/Import**: Backup and restore dashboard configurations
- **Theme Toggle**: Switch between light and dark modes
- **Reset Option**: Clear all widgets and start fresh

## 🔧 Configuration

### API Configuration
The application uses Alpha Vantage API for financial data:
- **Free Tier**: 5 requests per minute, 500 requests per day
- **Rate Limiting**: Built-in request throttling and caching
- **Error Handling**: Graceful fallbacks and retry mechanisms

### Widget Configuration
Each widget can be customized with:
- **Symbols**: Stock symbols to monitor
- **Refresh Interval**: How often to update data
- **Display Options**: Chart intervals, table page sizes
- **Visual Settings**: Titles, colors, and layouts

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- **Desktop**: Full feature set with drag & drop
- **Tablet**: Touch-friendly interface with grid layout
- **Mobile**: Optimized widget stacking and navigation

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site deployment with serverless functions
- **AWS**: S3 + CloudFront for static hosting
- **Docker**: Containerized deployment for any platform

## 🔒 Security & Best Practices

- **API Key Management**: Environment variables for sensitive data
- **Rate Limiting**: Prevents API quota exhaustion
- **Error Boundaries**: Graceful error handling and recovery
- **Data Validation**: Input sanitization and type checking
- **Caching Strategy**: Reduces API calls and improves performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Alpha Vantage** for providing financial data API
- **Vercel** for hosting and deployment platform
- **Next.js Team** for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the API documentation for data-related questions

---

Built with ❤️ for the finance community
