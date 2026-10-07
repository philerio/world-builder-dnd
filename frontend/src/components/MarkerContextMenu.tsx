import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

type MarkerContextMenuProps = {
  open: boolean;
  position: {
    mouseX: number;
    mouseY: number;
  } | null;
  markerId: string | null;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

function MarkerContextMenu({
  open,
  position,
  markerId,
  onCreate,
  onEdit,
  onDelete,
  onClose,
}: MarkerContextMenuProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <Menu
        open={open && Boolean(position)}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={position ? {
          top: position.mouseY,
          left: position.mouseX,
        } : undefined}
      >
        {markerId ? (
          <>
            <MenuItem
              onClick={() => {
                onEdit();
                onClose();
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Marker</ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => {
                setDeleteConfirmOpen(true);
                onClose();
              }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete Marker</ListItemText>
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={() => {
              onCreate();
              onClose();
            }}
          >
            <ListItemIcon>
              <AddLocationAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Create Marker</ListItemText>
          </MenuItem>
        )}
      </Menu>
      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete this marker?</DialogTitle>
        <DialogContent>
          <Typography>This removes the marker from this map. The linked entity stays in your world.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" disabled={deleting} onClick={async () => {
            setDeleting(true);
            try {
              await onDelete();
              setDeleteConfirmOpen(false);
            } finally {
              setDeleting(false);
            }
          }}>
            {deleting ? "Deleting…" : "Delete Marker"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MarkerContextMenu;
