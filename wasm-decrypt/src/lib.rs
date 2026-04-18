use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray},
    Aes256Gcm, Nonce,
};
use hex::FromHex;
use zeroize::Zeroizing;

// 3. OBFUSCATED AT COMPILE TIME
// During build, Bash will set BUILD_TIME_KEY variable which is the "rev" (reversed) result.
const OBFUSCATED_KEY: &str = env!("BUILD_TIME_KEY");

#[wasm_bindgen]
pub fn decrypt(encrypted_hex: &str, iv_hex: &str, auth_tag_hex: &str) -> Result<String, JsValue> {
    // Reverse the string back to normal key during runtime 
    let reversed_key: String = OBFUSCATED_KEY.chars().rev().collect();
    
    // Use Zeroizing so the key is automatically wiped from memory on drop
    let key_bytes = Zeroizing::new(Vec::from_hex(&reversed_key).map_err(|_| "Invalid key format")?);
    
    // Setup the Aes256Gcm decipher
    let key = GenericArray::clone_from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(&key);
    
    // Decode inputs from hex
    let nonce_bytes = Vec::from_hex(iv_hex).map_err(|_| "Invalid IV")?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let mut ciphertext = Vec::from_hex(encrypted_hex).map_err(|_| "Invalid encrypted data")?;
    let auth_tag = Vec::from_hex(auth_tag_hex).map_err(|_| "Invalid auth tag")?;
    
    // Combine ciphertext and auth_tag (aes-gcm crate convention)
    ciphertext.extend_from_slice(&auth_tag);
    
    // Decrypt (Zeroize plaintext memory buffer before converting to JS String)
    let plaintext = Zeroizing::new(cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed")?);
        
    let string_result = String::from_utf8(plaintext.to_vec())
        .map_err(|_| "Invalid UTF-8 in decrypted data")?;
        
    Ok(string_result)
}
