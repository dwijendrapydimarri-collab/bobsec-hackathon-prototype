export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          high: '#DC2626',
          medium: '#D97706',
          low: '#2563EB',
          safe: '#16A34A',
          unknown: '#6B7280'
        }
      }
    }
  },
  plugins: []
}

// Made with Bob
