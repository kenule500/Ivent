"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Search, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UnsplashImage {
  id: string;
  description: string | null;
  urls: {
    small: string;
    regular: string;
  };
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function ImagePicker({ isOpen, onClose, onSelect }: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState("unsplash");
  const [query, setQuery] = useState("event");
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchImages = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
      );
      const data = await response.json();
      setImages(data.results || []);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab switching & lazy fetch Unsplash images on tab click
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "unsplash" && images.length === 0) {
      searchImages(query);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchImages(query);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        onSelect(base64);
        setUploading(false);
        onClose();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload image");
      setUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[560px] flex flex-col p-6 gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>Choose Cover Image</DialogTitle>
          <DialogDescription>
            Select an image from Unsplash or upload from your device
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="unsplash" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Unsplash
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Unsplash Tab */}
          <TabsContent value="unsplash" className="flex-1 flex flex-col gap-4 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for images..."
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </form>

            <div className="flex-1 overflow-y-auto p-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        onSelect(image.urls.regular);
                        onClose();
                      }}
                      className="group relative aspect-video overflow-hidden rounded-md border border-border bg-muted transition-all hover:ring-2 hover:ring-primary focus:outline-none"
                    >
                      <Image
                        src={image.urls.small}
                        alt={image.description || "Unsplash image"}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 33vw, 200px"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <p>Search for images to get started</p>
                  <Button size="sm" variant="outline" onClick={() => searchImages(query)}>
                    Load Default Images
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              Photos provided by{" "}
              <a
                href="https://unsplash.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Unsplash
              </a>
            </p>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div
              className="flex-1 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors bg-muted/20"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-muted">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF, or WEBP (max 5MB)
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
              Upload your own high-resolution image to use as the cover background.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}