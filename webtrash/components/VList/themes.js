// themes for VList

export const theme_dark = `
v-list-view {
--background: #191919;
--v-list-row-color: #ffffff;
--v-list-row-bg: #191919;
--v-list-row-outline: none;
--v-list-row-hover-color: #ffffff;
--v-list-row-hover-bg: #4d4d4d;
--v-list-row-hover-outline: none;
--v-list-row-pf-color: #ffffff;
--v-list-row-pf-bg: #191919;
--v-list-row-pf-outline: 1px solid #626262;
--v-list-row-focus-color: #ffffff;
--v-list-row-focus-bg: #777777;
--v-list-row-focus-outline: 1px solid #353535;
--v-list-row-dragging-color: rgba(255, 255, 255, 0.5);
}
`;


export function theme_autoCompute(light, dark) {
    return `${light}
@media screen and (prefers-color-scheme: dark) {
    ${dark}
}`;
}


