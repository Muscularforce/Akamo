# Akamo v1.4 - Changelog

## 🚀 New Features & Enhancements

* **Supabase Cover Storage (v1.4 Architecture Update):** 
  * Separated the upload pipeline: Audio files continue to be securely uploaded to Google Drive (saving Supabase bandwidth), but all Cover Images are now natively uploaded directly to the Supabase `songs` storage bucket. This permanently fixes the broken image issues caused by Google Drive's aggressive anti-hotlinking measures.
* **Admin "Rescue Covers" Tool:** 
  * Added a dedicated "Rescue Covers" button to the Uploads Dashboard exclusively for Admin accounts. This tool securely downloads all old, broken Google Drive covers and automatically migrates them to the new Supabase Storage pipeline.
* **Admin "Publishing As" Feature:** 
  * The "Publishing As" uploader menu is now an editable text input exclusively for Admin accounts. This allows admins to effortlessly upload and publish songs on behalf of other users/artists by specifying their custom username during the upload process.
* **Bulk Song Requests:** 
  * Users can now request multiple songs at once using a list format in the Request Modal. 
  * Song requests now properly capture and display the requesting user's username in the Admin panel for easier tracking.

## 🎨 UI & Design Updates

* **"Identify Song" Visual Overhaul:** 
  * The Autofill/Identify Song feature button has been dramatically enhanced with a vibrant, glowing green gradient and a dynamic shimmer hover effect to make the new feature stand out.
  * The "BETA" tag text inside the button was changed to black with a subtle dark background for perfect contrast against the bright green glow.
* **Version Indicator:** 
  * Added a sleek "v1.4" version indicator directly beneath the Akamo logo in the main sidebar.
* **Mobile Responsiveness:** 
  * Adjusted various UI elements to ensure they don't get clipped or chipped off on mobile devices, maintaining a premium mobile web experience.

## 🐛 Bug Fixes

* **Broken Cover Images:** Fixed the widespread issue where cover images displayed as broken icons across the Latest Sounds and Uploads dashboards due to Google Drive blocking third-party image embedding.
