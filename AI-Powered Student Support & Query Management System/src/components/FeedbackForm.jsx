import { Box, Button, Rating, TextField } from '@mui/material';
import { useApp } from '../context/appContext.js';

export default function FeedbackForm({ rating, feedback, setRating, setFeedback, onSubmit, busy }) {
  const { t } = useApp();
  return <Box>
    <Rating name="ticket-feedback-rating" value={rating} onChange={(_, value) => setRating(value || 0)} size="large" sx={{ my: 2.2 }} getLabelText={(value) => `${value} Star${value !== 1 ? 's' : ''}`} />
    <TextField fullWidth label={t('feedbackPlaceholder')} multiline minRows={2} value={feedback} onChange={(event) => setFeedback(event.target.value)} inputProps={{ maxLength: 1000 }} />
    <Button onClick={onSubmit} variant="contained" disabled={busy} sx={{ mt: 2 }}>{t('submitFeedback')}</Button>
  </Box>;
}
