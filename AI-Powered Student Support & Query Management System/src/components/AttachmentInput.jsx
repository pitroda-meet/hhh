import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { AttachFileRounded } from '@mui/icons-material';
import { useApp } from '../context/appContext.js';
import { validateAttachmentFiles } from '../utils/validation.js';

export default function AttachmentInput({ value = [], onChange, compact = false, disabled = false }) {
  const { t, toast } = useApp();

  const handleFiles = (event) => {
    const rawFiles = Array.from(event.target.files || []);
    const { accepted, errors } = validateAttachmentFiles(rawFiles, value);
    if (errors.length) {
      errors.forEach((msg) => toast(msg, 'warning'));
    }
    if (accepted.length) {
      onChange([...value, ...accepted]);
    }
    event.target.value = '';
  };

  return (
    <Box sx={compact ? {} : { p: 2.5, border: '1px dashed #ccd9e2', borderRadius: 2.5, bgcolor: '#fafcfd', textAlign: 'center' }}>
      <Button component="label" disabled={disabled} startIcon={<AttachFileRounded />} size="small" variant={compact ? 'text' : 'outlined'}>
        {t('addAttachment')}
        <input
          type="file"
          hidden
          multiple
          onChange={handleFiles}
          accept="image/*,.pdf,.doc,.docx,.txt"
          aria-label={t('attachments')}
        />
      </Button>
      {!compact && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {t('attachmentHint')} · Max 5 MB each (JPG, PNG, PDF, DOC, TXT)
        </Typography>
      )}
      {value.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          {value.map((file, i) => (
            <Chip
              size="small"
              key={`${file.name}-${i}`}
              label={`${file.name} (${Math.max(1, Math.round((file.size || 0) / 1024))} KB)`}
              onDelete={disabled ? undefined : () => onChange(value.filter((_, index) => index !== i))}
              sx={{ maxWidth: 260, bgcolor: '#edf3f7' }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
