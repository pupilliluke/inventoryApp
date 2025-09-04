import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LogIcon, UsersIcon, AddIcon, DeleteIcon, EraserIcon, BackIcon, DropdownIcon, ViewIcon, EditIcon } from './CustomIcons';

interface CustomIconButtonProps {
  iconType: 'log' | 'users' | 'add' | 'delete' | 'eraser' | 'back' | 'dropdown' | 'view' | 'edit';
  size?: number;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const CustomIconButton: React.FC<CustomIconButtonProps> = ({
  iconType,
  size = 28,
  color = '#666666',
  onPress,
  disabled = false,
  style
}) => {
  const getIcon = () => {
    switch (iconType) {
      case 'log':
        return <LogIcon size={size} color={color} />;
      case 'users':
        return <UsersIcon size={size} color={color} />;
      case 'add':
        return <AddIcon size={size} color={color} />;
      case 'delete':
        return <DeleteIcon size={size} color={color} />;
      case 'eraser':
        return <EraserIcon size={size} color={color} />;
      case 'back':
        return <BackIcon size={size} color={color} />;
      case 'dropdown':
        return <DropdownIcon size={size} color={color} />;
      case 'view':
        return <ViewIcon size={size} color={color} />;
      case 'edit':
        return <EditIcon size={size} color={color} />;
      default:
        return <AddIcon size={size} color={color} />;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          opacity: disabled ? 0.5 : 1,
        },
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {getIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 48,
    minHeight: 48,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
});

export default CustomIconButton;