import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItemIcon, ListItemText, Menu, MenuItem, Typography, TextField, Box } from "@mui/material";
import type { MapLayer } from "../types";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";

type MarkerContextMenuProps = {
  open: boolean;
  position: {
    mouseX: number;
    mouseY: number;
  } | null;
  markerId: string | null;
  onCreate: () => void;
  onEdit: () => void;
  onDuplicate: (markerId: string) => void;
  onChangeOrder: (markerId: string, direction: "front" | "back") => void;
  onDelete: (markerId: string) => Promise<void>;
  onClose: () => void;
  layers?: MapLayer[];
  unavailableLayers?: string[];
  onMoveToLayer?: (markerId: string, layerId: string | null) => void;
};

function MarkerContextMenu({
  open,
  position,
  markerId,
  onCreate,
  onEdit,
  onDuplicate,
  onChangeOrder,
  onDelete,
  onClose,
  layers = [],
  unavailableLayers = [],
  onMoveToLayer,
}: MarkerContextMenuProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMarkerId, setDeleteMarkerId] = useState<string | null>(null);
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
            {onMoveToLayer && <Box sx={{ px: 2, py: 1 }}>
              <TextField select fullWidth size="small" label="Move to layer" value="__choose__" onChange={(event) => { onMoveToLayer(markerId, event.target.value || null); onClose(); }}>
                <MenuItem value="__choose__" disabled>Choose destination</MenuItem>
                <MenuItem value="">Unassigned</MenuItem>
                {layers.map((layer) => <MenuItem key={layer.id} value={layer.id} disabled={unavailableLayers.includes(layer.id)}>{layer.name}</MenuItem>)}
              </TextField>
            </Box>}
            <MenuItem
              onClick={() => {
                onDuplicate(markerId);
                onClose();
              }}
            >
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate map item</ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => {
                onChangeOrder(markerId, "front");
                onClose();
              }}
            >
              <ListItemIcon>
                <VerticalAlignTopIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Bring to front"
                secondary="Within this layer"
              />
            </MenuItem>

            <MenuItem
              onClick={() => {
                onChangeOrder(markerId, "back");
                onClose();
              }}
            >
              <ListItemIcon>
                <VerticalAlignBottomIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Send to back"
                secondary="Within this layer"
              />
            </MenuItem>

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
                setDeleteMarkerId(markerId);
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
          <Button color="error" disabled={deleting || !deleteMarkerId} onClick={async () => {
            if (!deleteMarkerId) return;
            setDeleting(true);
            try {
              await onDelete(deleteMarkerId);
              setDeleteConfirmOpen(false);
              setDeleteMarkerId(null);
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
