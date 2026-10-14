import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useWorldData } from "../context/WorldDataContext";
import type { PriceListItem } from "../types";

const COIN_DENOMINATIONS = ["gp", "sp", "cp"] as const;
const MAGIC_ITEM_GUIDE_CATEGORY = "Magic Item Guide";
type StoreSection = "equipment" | "magic_items" | "magic_guide";
type CoinAmounts = Record<(typeof COIN_DENOMINATIONS)[number], string>;

const DEFAULT_MAGIC_GUIDE_ITEMS: PriceListItem[] = [
  { id: "magic-common", name: "Common magic item", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 10_000, notes: "Optional 2024 reference price. Halve for consumables other than spell scrolls." },
  { id: "magic-uncommon", name: "Uncommon magic item", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 40_000, notes: "Optional 2024 reference price. Halve for consumables other than spell scrolls." },
  { id: "magic-rare", name: "Rare magic item", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 400_000, notes: "Optional 2024 reference price. Add the mundane item's cost for magic armor or weapons." },
  { id: "magic-very-rare", name: "Very Rare magic item", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 4_000_000, notes: "Optional 2024 reference price. Add the mundane item's cost for magic armor or weapons." },
  { id: "magic-legendary", name: "Legendary magic item", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 20_000_000, notes: "Optional 2024 reference price. Add the mundane item's cost for magic armor or weapons." },
  { id: "magic-artifact", name: "Artifact", category: MAGIC_ITEM_GUIDE_CATEGORY, price_copper: 0, notes: "Priceless and unique; not normally available for purchase." },
];

function coinAmounts(priceCopper: number): CoinAmounts {
  return {
    gp: String(Math.floor(priceCopper / 100)),
    sp: String(Math.floor((priceCopper % 100) / 10)),
    cp: String(priceCopper % 10),
  };
}

function copperValue(coins: CoinAmounts): number {
  const amount = (value: string) => Math.max(0, Math.floor(Number(value) || 0));
  return amount(coins.gp) * 100 + amount(coins.sp) * 10 + amount(coins.cp);
}

function formatPrice(priceCopper: number): string {
  const gold = Math.floor(priceCopper / 100);
  const silver = Math.floor((priceCopper % 100) / 10);
  const copper = priceCopper % 10;
  const parts = [
    gold ? `${gold} gp` : "",
    silver ? `${silver} sp` : "",
    copper ? `${copper} cp` : "",
  ].filter(Boolean);
  return parts.join(" ") || "0 cp";
}

function PriceFields({
  value,
  onChange,
}: {
  value: CoinAmounts;
  onChange: (value: CoinAmounts) => void;
}) {
  return (
    <Stack direction="row" spacing={1}>
      {COIN_DENOMINATIONS.map((coin) => (
        <TextField
          key={coin}
          label={coin.toUpperCase()}
          type="number"
          value={value[coin]}
          onChange={(event) => onChange({ ...value, [coin]: event.target.value })}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
          fullWidth
        />
      ))}
    </Stack>
  );
}

function StorePage() {
  const { worldData, updateEntity } = useWorldData();
  const priceList = worldData?.price_lists?.[0];
  const [activeSection, setActiveSection] = useState<StoreSection>("equipment");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [editCoins, setEditCoins] = useState<CoinAmounts>(coinAmounts(0));
  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Adventuring Gear");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemCoins, setNewItemCoins] = useState<CoinAmounts>(coinAmounts(0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sectionItems = useMemo(
    () =>
      (priceList?.items ?? []).filter((item) => {
        if (activeSection === "equipment") {
          return !item.category.startsWith("Magic Item");
        }
        if (activeSection === "magic_guide") {
          return false;
        }
        return item.category.startsWith("Magic Item") && item.category !== MAGIC_ITEM_GUIDE_CATEGORY;
      }),
    [activeSection, priceList],
  );
  const magicGuideItems = useMemo(() => {
    const storedGuideItems = (priceList?.items ?? []).filter(
      (item) => item.category === MAGIC_ITEM_GUIDE_CATEGORY,
    );
    const defaults = DEFAULT_MAGIC_GUIDE_ITEMS.map(
      (defaultItem) =>
        storedGuideItems.find((storedItem) => storedItem.id === defaultItem.id) ??
        defaultItem,
    );
    const defaultIds = new Set(DEFAULT_MAGIC_GUIDE_ITEMS.map((item) => item.id));
    return [
      ...defaults,
      ...storedGuideItems.filter((item) => !defaultIds.has(item.id)),
    ];
  }, [priceList]);
  const visibleSectionItems = activeSection === "magic_guide" ? magicGuideItems : sectionItems;
  const categories = useMemo(
    () => [...new Set(visibleSectionItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b)),
    [visibleSectionItems],
  );
  const filteredItems = useMemo(() => {
    if (activeSection === "magic_guide") {
      return [...magicGuideItems];
    }
    const query = search.trim().toLocaleLowerCase();
    return [...visibleSectionItems]
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => !query || `${item.name} ${item.category} ${item.notes ?? ""}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeSection, category, magicGuideItems, search, visibleSectionItems]);

  const saveItems = async (items: PriceListItem[], successMessage: string): Promise<boolean> => {
    if (!priceList) return false;
    setSaving(true);
    setError(null);
    try {
      await updateEntity(priceList.id, { ...priceList, items });
      setNotice(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the price list.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: PriceListItem) => {
    setEditingItem(item);
    setEditCoins(coinAmounts(item.price_copper));
  };

  const handleSavePrice = async () => {
    if (!priceList || !editingItem) return;
    const updatedItem = { ...editingItem, price_copper: copperValue(editCoins) };
    const items = priceList.items.some((item) => item.id === editingItem.id)
      ? priceList.items.map((item) => item.id === editingItem.id ? updatedItem : item)
      : [...priceList.items, updatedItem];
    const saved = await saveItems(
      items,
      `Updated ${editingItem.name}.`,
    );
    if (saved) setEditingItem(null);
  };

  const handleAddItem = async () => {
    if (!priceList || !newItemName.trim() || !newItemCategory.trim()) return;
    const baseId = newItemName.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
    let itemId = baseId;
    let suffix = 2;
    while (priceList.items.some((item) => item.id === itemId)) itemId = `${baseId}-${suffix++}`;
    const item: PriceListItem = {
      id: itemId,
      name: newItemName.trim(),
      category: newItemCategory.trim(),
      price_copper: copperValue(newItemCoins),
      ...(newItemNotes.trim() ? { notes: newItemNotes.trim() } : {}),
    };
    const saved = await saveItems([...priceList.items, item], `Added ${item.name}.`);
    if (saved) {
      setAddOpen(false);
      setNewItemName("");
      setNewItemNotes("");
      setNewItemCoins(coinAmounts(0));
    }
  };

  const openAddItem = () => {
    setNewItemCategory(
      activeSection === "equipment"
        ? "Adventuring Gear"
        : activeSection === "magic_guide"
          ? MAGIC_ITEM_GUIDE_CATEGORY
          : "Magic Item · Wondrous",
    );
    setAddOpen(true);
  };

  const formatItemPrice = (item: PriceListItem) =>
    item.id === "magic-artifact" && item.price_copper === 0
      ? "Priceless"
      : formatPrice(item.price_copper);

  const handleDeleteItem = async (item: PriceListItem) => {
    if (!priceList || !window.confirm(`Remove ${item.name} from the price list?`)) return;
    await saveItems(priceList.items.filter((candidate) => candidate.id !== item.id), `Removed ${item.name}.`);
  };

  if (!priceList) {
    return (
      <Box>
        <Typography variant="h1">Store Price List</Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No price list is configured yet. Add a Price List entity through the create menu or Data Health YAML tools.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, borderBottom: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.15em" }}>DM REFERENCE</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ mt: 0.5 }}>{priceList.name}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Quick lookup for common gear prices when players ask. Edit prices to fit your campaign.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddItem}>Add item</Button>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Tabs
          value={activeSection}
          onChange={(_event, value: StoreSection) => {
            setActiveSection(value);
            setCategory("all");
            setSearch("");
          }}
          aria-label="Store price reference section"
          sx={{ mb: 2 }}
        >
          <Tab value="equipment" label="Equipment" />
          <Tab value="magic_items" label="Magic Item Suggestions" />
          <Tab value="magic_guide" label="Rarity Price Guide" />
        </Tabs>

        {activeSection !== "equipment" && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {activeSection === "magic_guide"
              ? "Quick reference: all rarity values are shown here regardless of search or category filters. These are optional 2024 values, separate from the 2014 equipment list. Halve consumables except spell scrolls; add mundane equipment cost for magic armor and weapons."
              : "Optional 2024 5e reference values, separate from the 2014 equipment list. Halve prices for consumables other than spell scrolls. Add the base equipment cost for magic armor and weapons; availability is still up to the DM."}{" "}
            <a href="https://www.dndbeyond.com/sources/dnd/br-2024/magic-items" target="_blank" rel="noreferrer">
              View the source rules
            </a>
          </Alert>
        )}

        {activeSection !== "magic_guide" && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label="Search items"
            placeholder="Try rope, armor, tools..."
            slotProps={{ input: { startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> } }}
            fullWidth
          />
          <TextField select value={category} onChange={(event) => setCategory(event.target.value)} label="Category" sx={{ minWidth: { sm: 230 } }}>
            <MenuItem value="all">All categories</MenuItem>
            {categories.map((itemCategory) => <MenuItem key={itemCategory} value={itemCategory}>{itemCategory}</MenuItem>)}
          </TextField>
        </Stack>}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
        <Card>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <TableContainer sx={{ maxHeight: "calc(100vh - 330px)" }}>
              <Table stickyHeader size="small" aria-label="Store reference prices">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right" sx={{ width: 104 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                        {item.notes && <Typography variant="caption" color="text.secondary">{item.notes}</Typography>}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatItemPrice(item)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <IconButton aria-label={`Edit price for ${item.name}`} title="Edit price" size="small" onClick={() => openEdit(item)} disabled={saving}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        {!(activeSection === "magic_guide" && DEFAULT_MAGIC_GUIDE_ITEMS.some((guideItem) => guideItem.id === item.id)) && (
                          <IconButton aria-label={`Remove ${item.name}`} title="Remove item" size="small" onClick={() => void handleDeleteItem(item)} disabled={saving}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredItems.length && (
                    <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 2 }}>No items match this search.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          {activeSection === "equipment"
            ? "Equipment reference prices use common mundane costs from the 2014 5e Basic Rules/SRD. Availability and final prices are set by the DM."
            : activeSection === "magic_guide"
              ? "Magic item values are optional rarity-based reference prices. Adjust them to your campaign's economy and availability."
              : "These named examples use the optional rarity guide as a starting price. Edit them to fit the item and your campaign."}
        </Typography>
      </Box>

      <Dialog open={Boolean(editingItem)} onClose={() => setEditingItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit price{editingItem ? ` · ${editingItem.name}` : ""}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Enter a value in each coin denomination.</Typography>
          <PriceFields value={editCoins} onChange={setEditCoins} />
          <Typography variant="body2" sx={{ mt: 1.5 }}>Total: {formatPrice(copperValue(editCoins))}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSavePrice()} disabled={saving}>Save price</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{activeSection === "equipment" ? "Add a price list item" : "Add a magic item reference"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Item name" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} fullWidth />
            <TextField label="Category" value={newItemCategory} onChange={(event) => setNewItemCategory(event.target.value)} fullWidth />
            <TextField label="Notes (optional)" value={newItemNotes} onChange={(event) => setNewItemNotes(event.target.value)} multiline minRows={2} fullWidth />
            <PriceFields value={newItemCoins} onChange={setNewItemCoins} />
            <Typography variant="body2">Price: {formatPrice(copperValue(newItemCoins))}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleAddItem()} disabled={saving || !newItemName.trim() || !newItemCategory.trim()}>Add item</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StorePage;
