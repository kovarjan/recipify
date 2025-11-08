import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
    label: string;
    theme?: 'primary' | 'secondary';
    onPress?: () => void;
    style?: object;
};

export default function Button({ label, theme, onPress, style }: Props) {
    if (theme === 'primary') {
        return (
            <View
                style={[
                    styles.buttonContainer,
                    { borderWidth: 4, borderColor: '#ffd33d', borderRadius: 18 },
                    style,
                ]}>
                <Pressable
                    style={[styles.button, { backgroundColor: '#fff' }]}
                    onPress={onPress || (() => alert('You pressed a button (undefined).'))}>
                    <FontAwesome name="picture-o" size={18} color="#25292e" style={styles.buttonIcon} />
                    <Text style={[styles.buttonLabel, { color: '#25292e' }]}>{label}</Text>
                </Pressable>
            </View>
        );
    } else if (theme === 'secondary') {
        return (
            <View
                style={styles.buttonSecondaryContainer}>
                <Pressable
                    style={[styles.button, { backgroundColor: 'transparent' }]}
                    onPress={onPress || (() => alert('You pressed a button (undefined).'))}>
                    <Text style={[styles.buttonLabel, { color: '#25292e' }]}>{label}</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.buttonContainer}>
            <Pressable style={styles.button} onPress={onPress || (() => alert('You pressed a button (undefined).'))}>
                <Text style={styles.buttonLabel}>{label}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        width: 320,
        height: 68,
        marginHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
    },
    button: {
        borderRadius: 10,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonIcon: {
        paddingRight: 8,
    },
    buttonLabel: {
        color: '#fff',
        fontSize: 16,
    },
    buttonSecondaryContainer: {
        width: 200,
        height: 28,
        marginHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        borderWidth: 2,
        borderColor: '#25292e',
        borderRadius: 18,
        backgroundColor: 'transparent',
    }
});
