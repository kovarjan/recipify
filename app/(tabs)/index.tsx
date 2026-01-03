import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// App entry point - dummy screen never should be seen
export default function Index() {
    return (
        <GestureHandlerRootView style={styles.container}>
            <View
                style={styles.container}
            >
                <Text style={styles.text}>Welcome to Recipify!</Text>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 40,
        paddingBottom: 40,
        flex: 1,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    text: {
        color: '#000',
    },

});