#!/bin/bash

# Script to update gas settings in improved-web3-service.ts

# Path to the file
FILE="client/src/lib/improved-web3-service.ts"

# Function to safely replace a specific section of the file
# $1: Line number start
# $2: Line number end
# $3: Replacement text
replace_lines() {
  start=$1
  end=$2
  replacement="$3"
  
  # Create temporary file
  temp_file=$(mktemp)
  
  # Copy lines before the section to replace
  head -n $((start-1)) "$FILE" > "$temp_file"
  
  # Add the replacement text
  echo "$replacement" >> "$temp_file"
  
  # Copy lines after the section to replace
  tail -n +$((end+1)) "$FILE" >> "$temp_file"
  
  # Replace the original file
  cat "$temp_file" > "$FILE"
  
  # Clean up
  rm "$temp_file"
}

# 1. Update voter registration gas settings (lines 478-484)
replacement1="      // Use moderate gas settings for Polygon Amoy
      const options = {
        gasLimit: 300000, // Sufficient gas limit for voter registration
        maxPriorityFeePerGas: ethers.parseUnits(\"2.0\", \"gwei\"), // Lower priority fee
        maxFeePerGas: ethers.parseUnits(\"8.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 478 484 "$replacement1"

# 2. Update batch voter registration gas settings (lines 506-512)
replacement2="      // Use moderate gas settings for batch operations
      const options = {
        gasLimit: 600000, // Moderate gas limit for batch operations
        maxPriorityFeePerGas: ethers.parseUnits(\"2.5\", \"gwei\"), // Moderate priority fee
        maxFeePerGas: ethers.parseUnits(\"9.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 506 512 "$replacement2"

# 3. Update candidate creation gas settings (lines 534-540)
replacement3="      // Use moderate gas settings for candidate creation
      const options = {
        gasLimit: 300000, // Sufficient gas limit for candidate creation
        maxPriorityFeePerGas: ethers.parseUnits(\"2.0\", \"gwei\"), // Lower priority fee
        maxFeePerGas: ethers.parseUnits(\"8.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 534 540 "$replacement3"

# 4. Update candidate registration gas settings (lines 570-576)
replacement4="      // Use moderate gas settings for candidate registration
      const options = {
        gasLimit: 300000, // Sufficient gas limit for registering candidates
        maxPriorityFeePerGas: ethers.parseUnits(\"2.0\", \"gwei\"), // Lower priority fee
        maxFeePerGas: ethers.parseUnits(\"8.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 570 576 "$replacement4"

# 5. Update ticket creation gas settings (lines 606-612)
replacement5="      // Use moderate gas settings for ticket creation
      const options = {
        gasLimit: 300000, // Sufficient gas limit for ticket creation
        maxPriorityFeePerGas: ethers.parseUnits(\"2.0\", \"gwei\"), // Lower priority fee
        maxFeePerGas: ethers.parseUnits(\"8.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 606 612 "$replacement5"

# 6. Update ticket registration gas settings (lines 646-652)
replacement6="      // Use moderate gas settings for ticket registration
      const options = {
        gasLimit: 300000, // Sufficient gas limit for registering tickets
        maxPriorityFeePerGas: ethers.parseUnits(\"2.0\", \"gwei\"), // Lower priority fee
        maxFeePerGas: ethers.parseUnits(\"8.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 646 652 "$replacement6"

# 7. Update auto-update election status gas settings (lines 716-722)
replacement7="      // Use moderate gas settings for updating election status
      const options = {
        gasLimit: 750000, // Sufficient gas limit for auto-updating election status
        maxPriorityFeePerGas: ethers.parseUnits(\"3.0\", \"gwei\"), // Moderate priority fee
        maxFeePerGas: ethers.parseUnits(\"12.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 716 722 "$replacement7"

# 8. Update direct update gas settings (lines 749-754)
replacement8="        const directOptions = {
          gasLimit: 1000000, // Sufficient gas limit for direct status updates
          maxPriorityFeePerGas: ethers.parseUnits(\"4.0\", \"gwei\"), // Moderate priority fee for important operations
          maxFeePerGas: ethers.parseUnits(\"15.0\", \"gwei\"), // Reasonable max fee for important operations
          type: 2, // Use EIP-1559 transaction type
        };"
replace_lines 749 754 "$replacement8"

# 9. Update medium settings (lines 786-792)
replacement9="      // Use moderate gas settings for Polygon Amoy
      const options = {
        gasLimit: 600000, // Moderate gas limit for vote operations
        maxPriorityFeePerGas: ethers.parseUnits(\"2.5\", \"gwei\"), // Moderate priority fee
        maxFeePerGas: ethers.parseUnits(\"9.0\", \"gwei\"), // Reasonable max fee
        type: 2, // Use EIP-1559 transaction type
      };"
replace_lines 786 792 "$replacement9"

echo "Gas settings updated successfully!"