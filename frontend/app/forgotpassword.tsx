import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet
} from "react-native";


export default function ForgotPasswordScreen() {

  const [email, setEmail] = useState<string>("");


  const sendResetLink = async () => {

    if (!email) {
      Alert.alert(
        "Error",
        "Please enter your email"
      );
      return;
    }


    try {

      const response = await fetch(
        "http://10.132.83.9:8080/api/auth/forgot-password",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email: email
          })
        }
      );


      const message = await response.text();


      Alert.alert(
        "Reset Password",
        message
      );


    } catch (error) {

      Alert.alert(
        "Error",
        "Could not connect to server"
      );

    }

  };


  return (

    <View style={styles.container}>


      <Text style={styles.title}>
        Forgot Password
      </Text>


      <Text style={styles.subtitle}>
        Enter your email and we will send you a reset link.
      </Text>



      <TextInput

        style={styles.input}

        placeholder="Enter your email"

        placeholderTextColor="#888"

        value={email}

        onChangeText={setEmail}

        keyboardType="email-address"

        autoCapitalize="none"

      />



      <TouchableOpacity

        style={styles.button}

        onPress={sendResetLink}

      >

        <Text style={styles.buttonText}>
          Send Reset Link
        </Text>

      </TouchableOpacity>


    </View>

  );
}



const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#000",
    justifyContent:"center",
    padding:25
  },


  title:{
    color:"#fff",
    fontSize:28,
    fontWeight:"bold",
    marginBottom:10
  },


  subtitle:{
    color:"#aaa",
    marginBottom:30,
    fontSize:14
  },


  input:{
    backgroundColor:"#fff",
    borderRadius:12,
    padding:15,
    marginBottom:20,
    fontSize:16
  },


  button:{
    backgroundColor:"#2563EB",
    padding:18,
    borderRadius:15,
    alignItems:"center"
  },


  buttonText:{
    color:"#fff",
    fontWeight:"bold",
    fontSize:16
  }

});