import { Box, Button, Rating, TextField } from '@mui/material';
import { useApp } from '../context/appContext.js';

export default function FeedbackForm({ rating, feedback, setRating, setFeedback, onSubmit, busy }) {
  const { t } = useApp();
  return <Box data-pitch="feedback-form">
    <Rating data-pitch="ticket-rating" name="ticket-feedback-rating" value={rating} onChange={(_, value) => setRating(value || 0)} size="large" sx={{ my: 2.2 }} getLabelText={(value) => `${value} Star${value !== 1 ? 's' : ''}`} />
    <TextField data-pitch="ticket-feedback" fullWidth label={t('feedbackPlaceholder')} multiline minRows={2} value={feedback} onChange={(event) => setFeedback(event.target.value)} inputProps={{ maxLength: 1000 }} />
    <Button data-pitch="submit-feedback" onClick={onSubmit} variant="contained" disabled={!rating || busy} sx={{ mt: 2 }}>{t('submitFeedback')}</Button>
  </Box>;
}
