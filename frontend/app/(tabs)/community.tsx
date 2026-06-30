import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>

      {/* HEADER */}
      <View
        style={{
          backgroundColor: '#2563EB',
          padding: 24,
          paddingTop: 60,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          Community
        </Text>

        <Text
          style={{
            color: '#E0F2FE',
            fontSize: 13,
            marginTop: 4,
          }}
        >
          Join a health group today
        </Text>
      </View>

      {/* INFO CARD */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          margin: 20,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: '#6B7280',
            lineHeight: 20,
          }}
        >
          Connect with people who share similar health experiences and learn
          from verified pharmacists.
        </Text>
      </View>

      {/* COMMUNITIES LIST */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: 16,
          }}
        >
          Popular Groups
        </Text>

        {/* GROUP 1 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              backgroundColor: '#2563EB',
              borderRadius: 16,
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="heart" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: 'bold',
                color: '#111827',
                fontSize: 15,
              }}
            >
              Diabetes Support
            </Text>

            <Text
              style={{
                color: '#6B7280',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              1,240 members · 5 posts today
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#DBEAFE',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: '#2563EB',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              Join
            </Text>
          </View>
        </TouchableOpacity>

        {/* GROUP 2 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              backgroundColor: '#8B5CF6',
              borderRadius: 16,
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="happy-outline" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: 'bold',
                color: '#111827',
                fontSize: 15,
              }}
            >
              Mental Health
            </Text>

            <Text
              style={{
                color: '#6B7280',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              3,891 members · 12 posts today
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#EDE9FE',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: '#8B5CF6',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              Join
            </Text>
          </View>
        </TouchableOpacity>

        {/* GROUP 3 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              backgroundColor: '#14B8A6',
              borderRadius: 16,
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="fitness" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: 'bold',
                color: '#111827',
                fontSize: 15,
              }}
            >
              Hypertension Care
            </Text>

            <Text
              style={{
                color: '#6B7280',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              2,105 members · 8 posts today
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#CCFBF1',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: '#14B8A6',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              Join
            </Text>
          </View>
        </TouchableOpacity>

        {/* GROUP 4 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              backgroundColor: '#F59E0B',
              borderRadius: 16,
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="ribbon" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: 'bold',
                color: '#111827',
                fontSize: 15,
              }}
            >
              Cancer Survivors
            </Text>

            <Text
              style={{
                color: '#6B7280',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              987 members · 3 posts today
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: '#F59E0B',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              Join
            </Text>
          </View>
        </TouchableOpacity>

        {/* GROUP 5 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              backgroundColor: '#DC2626',
              borderRadius: 16,
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="water" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: 'bold',
                color: '#111827',
                fontSize: 15,
              }}
            >
              Sickle Cell Warriors
            </Text>

            <Text
              style={{
                color: '#6B7280',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              1,456 members · 6 posts today
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              Join
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* CREATE COMMUNITY BUTTON */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#2563EB',
            borderRadius: 16,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 15,
              marginLeft: 8,
            }}
          >
            Create a Community
          </Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}