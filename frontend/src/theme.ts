import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        background: {
            default: "#111318",
            paper: "#17191f",
        },
        primary: {
            main: "#b89b5e",
        },
        text: {
            primary: "#f4f4f5",
            secondary: "#9da3af",
        },
        divider: "#292c34",
    },

    typography: {
        fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

        h1: {
            fontSize: "2.25rem",
            fontWeight: 600,
        },

        h2: {
            fontSize: "1.4rem",
            fontWeight: 600,
        },
    },

    shape: {
        borderRadius: 10,
    },

    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    border: "1px solid #2d3038",
                },
            },
        },

        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundImage: "none",
                    borderColor: "#292c34",
                },
            },
        },
    },
});

export default theme;