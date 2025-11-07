import { Image } from 'expo-image';
import { ImageSourcePropType, StyleSheet } from 'react-native';

type Props = {
    imgSource: ImageSourcePropType;
    selectedImage?: string;
};

export default function ImageViewer({ imgSource, selectedImage }: Props) {
    return <Image source={selectedImage ? { uri: selectedImage } : imgSource} style={styles.image} />;
}

const styles = StyleSheet.create({
    image: {
        width: 320,
        height: 440,
        borderRadius: 18,
    },
});
