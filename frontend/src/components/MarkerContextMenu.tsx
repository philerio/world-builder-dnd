import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
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
  onDelete: () => void;
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
  if (!position) {
    return null;
  }

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{
        top: position.mouseY,
        left: position.mouseX,
      }}
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
              onDelete();
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
  );
}

export default MarkerContextMenu;
