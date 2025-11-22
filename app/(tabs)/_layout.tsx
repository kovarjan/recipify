import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function RootLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="recipes">
                <Label>Recipes</Label>
                <Icon sf="book.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="about">
                <Label>About</Label>
                <Icon sf="info.circle.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="import">
                <Icon sf="plus.circle.fill" drawable="custom_add_drawable" />
                <Label>Import</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <Label>Search</Label>
                <Icon sf="magnifyingglass" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="settings">
                <Icon sf="gearshape.fill" drawable="custom_settings_drawable" />
                <Label>Settings</Label>
            </NativeTabs.Trigger>

        </NativeTabs>
    );
}


