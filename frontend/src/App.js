import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import api from "./lib/api";   // ✅ use the shared axios instance
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Separator } from "./components/ui/separator";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Area, AreaChart
} from "recharts";
import { useDropzone } from "react-dropzone";
import { 
  Calendar, TrendingUp, Users, Target, Upload, Download, 
  BarChart3, Activity, AlertCircle, CheckCircle2, Brain, Settings
} from "lucide-react";
import { toast } from "sonner";
