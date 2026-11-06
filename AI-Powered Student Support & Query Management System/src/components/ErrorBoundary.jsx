import { Component } from 'react';
import { Box, Button, Typography } from '@mui/material';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Sahay render error:', error, info); }
  render() {
    if (this.state.error) return <Box sx={{ maxWidth: 560, mx: 'auto', py: 12, px: 3 }}><Typography variant="h3" gutterBottom>Let’s give that another try.</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Your saved support data is still on this device. Reload to return to your workspace.</Typography><Button variant="contained" onClick={() => window.location.reload()}>Reload Sahay</Button></Box>;
    return this.props.children;
  }
}
