"use client";

import React, { useState } from 'react';
import { Play, ArrowRight, CheckCircle, Star, BookOpen, Clock, Globe } from 'lucide-react';

export default function WelcomePagePreview() {
  const [activeIdea, setActiveIdea] = useState(1);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">
      {/* Navigation Switcher (Dành cho việc preview các Idea) */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 mb-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="text-sm font-medium text-muted-foreground mr-2">Chọn Layout:</span>
          <div className="flex bg-muted p-1 rounded-xl">
            <button
              onClick={() => setActiveIdea(1)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeIdea === 1
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Idea 1: Split Classic
            </button>
            <button
              onClick={() => setActiveIdea(2)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeIdea === 2
                  ? 'bg-background text-secondary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Idea 2: Centered Focus
            </button>
            <button
              onClick={() => setActiveIdea(3)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeIdea === 3
                  ? 'bg-background text-accent shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Idea 3: Bento Grid
            </button>
          </div>
        </div>
      </div>

      {/* Render the selected idea */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card text-card-foreground rounded-3xl border border-border overflow-hidden shadow-sm">
          {activeIdea === 1 && <IdeaOneClassic />}
          {activeIdea === 2 && <IdeaTwoCentered />}
          {activeIdea === 3 && <IdeaThreeBento />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// IDEA 1: SPLIT CLASSIC (Phân chia 2 cột truyền thống)
// Phù hợp nhất cho giáo viên muốn hiển thị ảnh chân dung rõ nét ngay từ đầu
// ==========================================
function IdeaOneClassic() {
  return (
    <div className="flex flex-col lg:flex-row items-center min-h-[80vh] p-8 lg:p-16 gap-12">
      <div className="flex-1 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent font-medium text-sm">
          <Star className="w-4 h-4 fill-accent" />
          Giáo viên tiếng Pháp cá nhân của bạn
        </div>

        <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
          Bonjour! Khám phá vẻ đẹp <span className="text-primary">Tiếng Pháp</span> cùng tôi.
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
          Lộ trình cá nhân hóa được thiết kế riêng giúp bạn tự tin giao tiếp và chinh phục các chứng chỉ DELF/DALF một cách hiệu quả nhất.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Học thử miễn phí <ArrowRight className="w-5 h-5" />
          </button>
          <button className="flex items-center justify-center gap-2 bg-transparent border-2 border-border text-foreground px-8 py-4 rounded-xl font-semibold hover:border-primary transition-colors">
            <Play className="w-5 h-5 text-secondary" /> Xem Video Giới thiệu
          </button>
        </div>

        <div className="flex gap-8 pt-8 border-t border-border mt-8">
          <div>
            <p className="text-3xl font-bold text-foreground">500+</p>
            <p className="text-sm text-muted-foreground">Học viên thành công</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">DALF</p>
            <p className="text-sm text-muted-foreground">Chứng chỉ C2</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        {/* Decorative background shape using Accent color */}
        <div className="absolute inset-0 bg-accent/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
        {/* Placeholder for Teacher's Portrait */}
        <div className="relative aspect-[4/5] bg-muted rounded-2xl overflow-hidden border border-border flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&h=800&auto=format&fit=crop"
            alt="Giáo viên tiếng Pháp"
            className="w-full h-full object-cover opacity-80"
          />
          {/* Floating Badge */}
          <div className="absolute bottom-8 left-[-20px] bg-card p-4 rounded-xl border border-border shadow-lg flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Tỉ lệ đỗ 98%</p>
              <p className="text-xs text-muted-foreground">Học viên thi DELF B2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// IDEA 2: CENTERED FOCUS (Căn giữa tập trung)
// Nhấn mạnh vào Video giới thiệu và cảm xúc truyền tải
// ==========================================
function IdeaTwoCentered() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-20 lg:py-28 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

      <div className="max-w-3xl space-y-6 relative z-10">
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
          Parlez-vous <span className="text-secondary">français?</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed px-4">
          Không chỉ là học ngữ pháp. Hãy hòa mình vào văn hóa và tự tin trò chuyện bằng tiếng Pháp ngay từ buổi học đầu tiên với phương pháp phản xạ 1-1.
        </p>

        <div className="flex justify-center pt-4">
          <button className="bg-secondary text-secondary-foreground px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(var(--secondary),0.3)]">
            Nhận tư vấn lộ trình ngay
          </button>
        </div>
      </div>

      {/* Video Placeholder */}
      <div className="w-full max-w-4xl mt-16 relative group cursor-pointer z-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative aspect-video bg-muted rounded-2xl border border-border flex items-center justify-center overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&h=675&auto=format&fit=crop"
            alt="Video Thumbnail"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-background/20 flex items-center justify-center group-hover:bg-background/10 transition-all">
            <div className="w-20 h-20 bg-background/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-primary ml-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Below Video */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mt-20 relative z-10">
        {[
          { icon: <BookOpen className="w-6 h-6 text-primary" />, title: "Giáo trình cá nhân", desc: "Biên soạn riêng theo mục tiêu của bạn" },
          { icon: <Clock className="w-6 h-6 text-secondary" />, title: "Lịch học linh hoạt", desc: "Tối ưu cho người đi làm và sinh viên" },
          { icon: <Globe className="w-6 h-6 text-accent" />, title: "Văn hóa thực tiễn", desc: "Giao tiếp tự nhiên như người bản xứ" },
        ].map((feature, idx) => (
          <div key={idx} className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-background/50 border border-border">
            <div className="p-3 rounded-full bg-card shadow-sm border border-border">
              {feature.icon}
            </div>
            <h3 className="font-bold text-lg">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// IDEA 3: BENTO GRID (Phá cách, Hiện đại)
// Hiển thị trực quan nhiều thông tin cùng lúc, phù hợp UI/UX xu hướng mới
// ==========================================
function IdeaThreeBento() {
  return (
    <div className="p-4 sm:p-8 lg:p-12">
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 lg:gap-6 min-h-[75vh]">

        {/* Ô 1: Main Intro (Teal/Primary Focus) */}
        <div className="md:col-span-2 md:row-span-2 bg-card rounded-3xl p-8 border border-border flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="space-y-6 relative z-10">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🇫🇷</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold">
              Tiếng Pháp không khó khi bạn có <span className="text-primary">người đồng hành</span> đúng.
            </h1>
            <p className="text-muted-foreground text-lg">
              Chào bạn, tôi là [Tên]. Tôi ở đây để giúp bạn biến nỗi sợ ngữ pháp thành sự tự tin trong giao tiếp.
            </p>
          </div>
          <button className="mt-8 bg-foreground text-background px-6 py-4 rounded-xl font-bold w-max hover:bg-primary transition-colors flex items-center gap-2">
            Bắt đầu hành trình <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Ô 2: Ảnh Portrait / Video Nhỏ */}
        <div className="md:col-span-2 md:row-span-2 bg-muted rounded-3xl border border-border overflow-hidden relative group">
          <img
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=600&h=600&auto=format&fit=crop"
            alt="Giáo viên"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm p-4 rounded-2xl flex justify-between items-center">
            <div>
              <p className="font-bold text-foreground">Gặp gỡ giáo viên</p>
              <p className="text-sm text-muted-foreground">Xem video giới thiệu 1 phút</p>
            </div>
            <button className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Ô 3: Stats/Kinh nghiệm (Secondary/Coral Focus) */}
        <div className="md:col-span-1 md:row-span-1 bg-secondary text-secondary-foreground rounded-3xl p-6 border border-border/50 flex flex-col justify-center">
          <p className="text-4xl font-black">5+</p>
          <p className="font-medium mt-1">Năm giảng dạy</p>
          <p className="text-xs text-secondary-foreground/80 mt-2">Chuyên luyện thi DELF B1-B2</p>
        </div>

        {/* Ô 4: Khóa học nổi bật (Accent/Yellow Focus) */}
        <div className="md:col-span-2 md:row-span-1 bg-accent text-accent-foreground rounded-3xl p-6 border border-border/50 flex items-center justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/30 text-xs font-bold uppercase tracking-wider">
              Khóa học Hot nhất
            </div>
            <h3 className="text-xl font-bold">Giao tiếp phản xạ 1-1</h3>
            <p className="text-accent-foreground/80 text-sm">Chỉ 3 tháng để tự tin nói chuyện.</p>
          </div>
          <div className="w-14 h-14 bg-background text-foreground rounded-full flex items-center justify-center -rotate-45 hover:rotate-0 transition-transform cursor-pointer shadow-sm">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>

        {/* Ô 5: Đánh giá nhanh */}
        <div className="md:col-span-1 md:row-span-1 bg-card rounded-3xl p-6 border border-border flex flex-col justify-center space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-accent text-accent" />)}
          </div>
          <p className="text-sm italic font-medium">"Cách dạy cực kỳ dễ hiểu và thực tế..."</p>
          <p className="text-xs text-muted-foreground font-bold">- Minh Anh, Học viên DELF B2</p>
        </div>

      </div>
    </div>
  );
}