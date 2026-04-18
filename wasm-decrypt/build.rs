use std::env;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    // Re-run build if this environment variable changes
    println!("cargo:rerun-if-env-changed=BUILD_TIME_KEY");

    // Fetch the raw key exported from bash. Fallback to zeros if not found.
    let raw_key = env::var("BUILD_TIME_KEY").unwrap_or_else(|_| "0".repeat(64));
    let key_bytes = raw_key.as_bytes();
    
    let mut xor_pad: Vec<u8> = Vec::new();
    let mut xored_key: Vec<u8> = Vec::new();
    
    // Create a time-based PRNG seed to ensure we get a new XOR pad on every build
    let time_seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    
    for (i, &b) in key_bytes.iter().enumerate() {
        // LCG (Linear Congruential Generator) style PRNG for simple padding
        let pad_byte = ((time_seed.wrapping_add(i as u128) * 1103515245 + 12345) >> 16) as u8;
        xor_pad.push(pad_byte);
        xored_key.push(b ^ pad_byte); // XOR operation here!
    }

    let out_dir = env::var_os("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("obfuscated_key.rs");
    
    // Write the arrays as Rust constants
    let generated_code = format!(
        "const XOR_PAD: [u8; {}] = {:?};\nconst XORED_KEY: [u8; {}] = {:?};\n",
        xor_pad.len(), xor_pad,
        xored_key.len(), xored_key
    );
    
    fs::write(&dest_path, generated_code).unwrap();
}
