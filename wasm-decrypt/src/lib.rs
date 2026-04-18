use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray},
    Aes256Gcm, Nonce,
};
use hex::FromHex;
use zeroize::Zeroizing;

// 3. OBFUSCATED AT COMPILE TIME (Via build.rs XOR Mutation)
include!(concat!(env!("OUT_DIR"), "/obfuscated_key.rs"));

#[wasm_bindgen]
pub fn decrypt(encrypted_hex: &str, iv_hex: &str, auth_tag_hex: &str) -> Result<String, JsValue> {
    // Reconstruct the hex string at runtime via XOR
    let mut original_key_bytes = Zeroizing::new(Vec::with_capacity(XORED_KEY.len()));
    for i in 0..XORED_KEY.len() {
        let original_byte = XORED_KEY[i] ^ XOR_PAD[i];
        original_key_bytes.push(original_byte);
    }
    
    // Use Zeroizing so the key is automatically wiped from memory on drop
    // We pass the raw bytes directly to hex parser so it never lives as a standard JS/Rust String.
    let key_bytes = Zeroizing::new(Vec::from_hex(&*original_key_bytes).map_err(|_| "Invalid key format")?);
    
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
