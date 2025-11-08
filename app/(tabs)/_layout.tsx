
// export default function RootLayout() {
//     return (
//         <Tabs
//             screenOptions={{
//                 tabBarActiveTintColor: '#ffd33d',
//                 headerStyle: {
//                     backgroundColor: '#25292e',
//                 },
//                 headerShadowVisible: false,
//                 headerTintColor: '#fff',
//                 tabBarStyle: {
//                     backgroundColor: '#25292e',
//                 },
//             }}
//         >
//             {/* //     <Tabs.Screen name="index" options={{ title: 'Home' }} />
//         //     <Tabs.Screen name="about" options={{ title: 'About' }} /> */}

//             <Tabs.Screen
//                 name="index"
//                 options={{
//                     title: 'Home',
//                     tabBarIcon: ({ color, focused }) => (
//                         <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
//                     ),
//                 }}
//             />
//             <Tabs.Screen
//                 name="about"
//                 options={{
//                     title: 'About',
//                     tabBarIcon: ({ color, focused }) => (
//                         <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24}/>
//                     ),
//                 }}
//             />
//         </Tabs>
//     );
// }

import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function RootLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <Label>Home</Label>
                <Icon sf="house.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            
            <NativeTabs.Trigger name="recepies">
                <Label>Recipes</Label>
                <Icon sf="book.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="about">
                <Label>About</Label>
                <Icon sf="info.circle.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            {/* <NativeTabs.Trigger name="settings" role="search">
            <Icon sf="gear" drawable="custom_settings_drawable" />
            <Label>Settings</Label>
            </NativeTabs.Trigger> */}

            <NativeTabs.Trigger name="capture">
                <Icon sf="plus.circle.fill" drawable="custom_add_drawable" />
                <Label>Import</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="search" role="search">
                <Label>Search</Label>
                <Icon sf="magnifyingglass" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}


