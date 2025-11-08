import React from "react";
import {
    ActivityIndicator,
    GestureResponderEvent,
    Pressable,
    PressableStateCallbackType,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export type ButtonProps = {
  label?: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  rounded?: boolean; // extra round corners
  disabled?: boolean;
  loading?: boolean;

  /** Optional icons (you can pass any ReactNode, not just FontAwesome) */
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;

  /** Icon-only button (ignores label spacing) */
  iconOnly?: boolean;

  /** Overrides */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;

  /** Accessibility */
  accessibilityLabel?: string;
  testID?: string;
};

export default function Button({
    label = "Button",
    onPress,
    variant = "primary",
    size = "md",
    fullWidth,
    rounded,
    disabled,
    loading,
    iconLeft,
    iconRight,
    iconOnly,
    style,
    textStyle,
    contentStyle,
    accessibilityLabel,
    testID,
}: ButtonProps) {
    const getStyles = (state?: PressableStateCallbackType) => {
        const pressed = !!state?.pressed;

        const base: ViewStyle = {
            borderRadius: rounded ? 999 : radiusBySize[size],
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            paddingHorizontal: padXBySize[size],
            height: heightBySize[size],
            opacity: disabled ? 0.6 : 1,
            ...(fullWidth ? { alignSelf: "stretch" } : {}),
        };

        const elevation: ViewStyle = {
            shadowColor: "#000",
            shadowOpacity: variant === "ghost" || variant === "outline" ? 0.04 : 0.08,
            shadowRadius: pressed ? 4 : 6,
            shadowOffset: { width: 0, height: pressed ? 2 : 3 },
            elevation: pressed ? 1 : 2,
        };

        const palettes = palette[variant];
        const bg: ViewStyle = {
            backgroundColor: palettes.bg(pressed),
            borderWidth: palettes.borderWidth ?? 0,
            borderColor: palettes.borderColor(pressed),
        };

        return StyleSheet.flatten([base, elevation, bg]);
    };

    const labelStyles: TextStyle = {
        ...typoBySize[size],
        color: palette[variant].fg,
        textAlign: "center",
    };

    const iconSpacing = iconOnly ? 0 : 8;

    return (
        <Pressable
            disabled={disabled || loading}
            onPress={onPress}
            style={(state) => [getStyles(state), style]}
            android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label}
            testID={testID}
        >
            <View style={[styles.content, contentStyle]}>
                {iconLeft ? <View style={{ marginRight: iconSpacing }}>{iconLeft}</View> : null}
                {!iconOnly && (
                    <Text numberOfLines={1} style={[labelStyles, textStyle]}>
                        {label}
                    </Text>
                )}
                {loading ? (
                    <View style={{ marginLeft: iconOnly ? 0 : 8 }}>
                        <ActivityIndicator size={size === "sm" ? "small" : "small"} color={palette[variant].fg} />
                    </View>
                ) : iconRight ? (
                    <View style={{ marginLeft: iconSpacing }}>{iconRight}</View>
                ) : null}
            </View>
        </Pressable>
    );
}

/* ---------------- theme + scales ---------------- */

const primary = "#111111";
const primaryFg = "#ffffff";
const secondaryBg = "#f4f4f5";
const secondaryFg = "#111111";
const outlineBorder = "#e4e4e7";
const ghostBgPressed = "#f4f4f5";
const danger = "#dc2626";

const palette: Record<
  Variant,
  {
    bg: (pressed: boolean) => string;
    borderColor: (pressed: boolean) => string;
    borderWidth?: number;
    fg: string;
  }
> = {
    primary: {
        bg: (p) => (p ? "#0d0d0d" : primary),
        borderColor: () => "transparent",
        fg: primaryFg,
    },
    secondary: {
        bg: (p) => (p ? "#e9e9eb" : secondaryBg),
        borderColor: () => "transparent",
        fg: secondaryFg,
    },
    outline: {
        bg: (p) => (p ? "#fafafa" : "#fff"),
        borderColor: () => outlineBorder,
        borderWidth: StyleSheet.hairlineWidth,
        fg: "#111",
    },
    ghost: {
        bg: (p) => (p ? ghostBgPressed : "transparent"),
        borderColor: () => "transparent",
        fg: "#111",
    },
    destructive: {
        bg: (p) => (p ? "#b91c1c" : danger),
        borderColor: () => "transparent",
        fg: "#fff",
    },
};

const heightBySize: Record<Size, number> = {
    sm: 36,
    md: 44,
    lg: 52,
};

const padXBySize: Record<Size, number> = {
    sm: 12,
    md: 16,
    lg: 18,
};

const radiusBySize: Record<Size, number> = {
    sm: 10,
    md: 12,
    lg: 14,
};

const typoBySize: Record<Size, TextStyle> = {
    sm: { fontSize: 14, fontWeight: "600" },
    md: { fontSize: 16, fontWeight: "600" },
    lg: { fontSize: 18, fontWeight: "700" },
};

const styles = StyleSheet.create({
    content: {
        minWidth: 44, // icon-only tap target
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
});
