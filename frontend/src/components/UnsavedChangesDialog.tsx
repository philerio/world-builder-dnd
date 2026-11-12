import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

type Props = {
  open: boolean;
  canKeepDraft: boolean;
  onKeepEditing: () => void;
  onKeepDraft: () => void;
  onDiscard: () => void;
};

export default function UnsavedChangesDialog({ open, canKeepDraft, onKeepEditing, onKeepDraft, onDiscard }: Props) {
  return (
    <Dialog open={open} onClose={onKeepEditing} fullWidth maxWidth="xs">
      <DialogTitle>Unsaved changes</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {canKeepDraft ? "Keep a draft in this browser to return to later, or discard your changes." : "Your changes have not been saved. Keep editing or discard them."}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
        <Button onClick={onKeepEditing}>Keep editing</Button>
        {canKeepDraft && <Button onClick={onKeepDraft}>Keep draft</Button>}
        <Button color="error" onClick={onDiscard}>Discard</Button>
      </DialogActions>
    </Dialog>
  );
}
